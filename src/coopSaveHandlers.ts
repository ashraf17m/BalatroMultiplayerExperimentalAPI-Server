import { randomBytes } from 'node:crypto'
import type Client from './Client.js'
import Lobby from './Lobby.js'
import type {
	ActionHandlerArgs,
	ActionResumeCoopSave,
	ActionSaveCoopRun,
	CoopSaveRecordWirePayload,
	CoopSaveSnapshotWirePayload,
	LobbyOptionsWirePayload,
} from './actions.js'
import {
	broadcastLobbyAction,
	broadcastLobbyInfo,
	sendInitialLobbyJoinedState,
} from './lobbyBroadcasts.js'
import { applyLobbyOptions } from './lobbyOptionUpdates.js'
import { getLobbyMaxPlayers } from './lobbyRules.js'
import { resetLobbyAnteTimer } from './lobbyAnteTimer.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { parseFiniteInsaneInt } from './InsaneInt.js'
import {
	clearPlayerLobbyMembership,
	preparePlayerForMatchStart,
	restorePlayerActiveCoopBlindState,
} from './playerState.js'
import { sendLobbyMatchStateToPlayer } from './lobbyPlayerState/broadcasts.js'
import {
	sendCoopSaveServerAction,
	sendSystemError,
} from './protocol/v2/index.js'
import { isCoopLobbyType } from './lobbyTypes.js'
import { removeLobbyByCode } from './lobbyRegistry.js'

type CoopSaveParticipant = {
	key: string
	name: string
}

type CoopSaveMetadata = {
	ante?: number
	blind?: string
	maxScore?: string
}

type ActiveCoopSaveVote = {
	participants: CoopSaveParticipant[]
	snapshots: Map<string, CoopSaveSnapshotWirePayload>
	options: LobbyOptionsWirePayload
	metadata: CoopSaveMetadata
}

type ActiveCoopSaveRestore = {
	save: CoopSaveRecordWirePayload
	lobby: Lobby
}

const activeVotesByLobbyCode = new Map<string, ActiveCoopSaveVote>()
const activeRestoresBySaveId = new Map<string, ActiveCoopSaveRestore>()

const getCoopSaveIdentityKey = (name: string): string =>
	name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

const normalizeClientIdentityKey = (client: Client) =>
	getCoopSaveIdentityKey(client.username)

const generateCoopSaveId = () => randomBytes(8).toString('hex')

const getUniqueCoopParticipants = (
	lobby: Lobby,
): CoopSaveParticipant[] | null => {
	const participants: CoopSaveParticipant[] = []
	const keys = new Set<string>()

	for (const player of lobby.getPlayers()) {
		const key = normalizeClientIdentityKey(player)
		if (!key || keys.has(key)) {
			return null
		}
		keys.add(key)
		participants.push({
			key,
			name: player.username,
		})
	}

	return participants
}

const getSaveParticipantKeys = (
	save: CoopSaveRecordWirePayload,
): Set<string> | null => {
	const keys = new Set<string>()

	for (const player of save.players) {
		const key = getCoopSaveIdentityKey(player.name)
		if (!key || keys.has(key) || !save.snapshots[key]) {
			return null
		}
		keys.add(key)
	}

	return keys
}

const isActiveCoopMatch = (client: Client) =>
	client.lobby &&
	client.lobby.gameMode === 'coop' &&
	isCoopLobbyType(client.lobby.lobbyType) &&
	client.lobby.isInGame

const getOrCreateActiveVote = (client: Client): ActiveCoopSaveVote | null => {
	const lobby = client.lobby
	if (!lobby) return null

	const existing = activeVotesByLobbyCode.get(lobby.code)
	if (existing) return existing

	const participants = getUniqueCoopParticipants(lobby)
	if (!participants) {
		sendSystemError(
			client,
			'Co-op saves require each player to have a unique full name.',
		)
		return null
	}

	const vote: ActiveCoopSaveVote = {
		participants,
		snapshots: new Map(),
		options: { ...lobby.options, gamemode: lobby.getClientGamemodeKey() },
		metadata: {},
	}
	activeVotesByLobbyCode.set(lobby.code, vote)
	return vote
}

const broadcastVoteStatus = (
	lobby: Lobby,
	vote: ActiveCoopSaveVote,
	save?: CoopSaveRecordWirePayload,
) => {
	broadcastLobbyAction(lobby, {
		action: 'coopSaveVote',
		voters: vote.snapshots.size,
		required: vote.participants.length,
		committed: save !== undefined,
		saveId: save?.saveId,
		save,
	})
}

const clearEmptyVote = (lobby: Lobby, vote: ActiveCoopSaveVote) => {
	if (vote.snapshots.size === 0) {
		activeVotesByLobbyCode.delete(lobby.code)
	}
}

export const clearCoopSaveVoteForLobby = (lobby: Lobby) => {
	activeVotesByLobbyCode.delete(lobby.code)
}

const mergeMetadata = (
	current: CoopSaveMetadata,
	args: ActionHandlerArgs<ActionSaveCoopRun>,
): CoopSaveMetadata => ({
	ante: args.ante ?? current.ante,
	blind: args.blind ?? current.blind,
	maxScore: args.maxScore ?? current.maxScore,
})

const normalizeSavedHandsLeft = (handsLeft: unknown): number | null => {
	const value = Number(handsLeft)
	if (!Number.isFinite(value)) return null
	return Math.max(0, Math.floor(value))
}

const getCoopRestoreStartingLives = (lobby: Lobby): number => {
	const value = Number(lobby.options.starting_lives ?? 1)
	if (!Number.isFinite(value)) return 1
	return Math.max(1, Math.floor(value))
}

const preparePlayerForCoopSaveRestoreLobby = (
	lobby: Lobby,
	player: Client,
) => {
	const lives = getCoopRestoreStartingLives(lobby)
	player.lives = lives
	lobby.teamState.setLives(player.team ?? 1, lives)
}

const restoreSavedPlayerBlindProgress = (
	player: Client,
	snapshot: CoopSaveSnapshotWirePayload,
) => {
	const savedScore =
		snapshot.score !== undefined
			? parseFiniteInsaneInt(String(snapshot.score))
			: null
	if (savedScore) {
		player.score = savedScore
	}

	const savedHandsLeft = normalizeSavedHandsLeft(snapshot.handsLeft)
	if (savedHandsLeft !== null) {
		player.handsLeft = savedHandsLeft
	}
}

const commitCompletedVote = (
	lobby: Lobby,
	vote: ActiveCoopSaveVote,
): CoopSaveRecordWirePayload => {
	const snapshots: Record<string, CoopSaveSnapshotWirePayload> = {}
	for (const participant of vote.participants) {
		const snapshot = vote.snapshots.get(participant.key)
		if (snapshot) {
			snapshots[participant.key] = snapshot
		}
	}

	const save: CoopSaveRecordWirePayload = {
		saveId: lobby.coopSaveId ?? generateCoopSaveId(),
		savedAt: Date.now(),
		players: vote.participants.map((participant) => ({
			name: participant.name,
		})),
		snapshots,
		options: vote.options,
		ante: vote.metadata.ante,
		blind: vote.metadata.blind,
		maxScore: vote.metadata.maxScore,
	}

	activeVotesByLobbyCode.delete(lobby.code)
	return save
}

const closeSavedRunLobby = (lobby: Lobby) => {
	const players = lobby.getPlayers()
	for (const player of players) {
		lobby.removePlayer(player.id)
		clearPlayerLobbyMembership(player)
	}
	removeLobbyByCode(lobby.code)
}

export const saveCoopRunAction = (
	args: ActionHandlerArgs<ActionSaveCoopRun>,
	client: Client,
) => {
	if (!isActiveCoopMatch(client)) {
		sendSystemError(client, 'Co-op saves are only available during co-op runs.')
		return
	}

	const lobby = client.lobby
	if (!lobby) return

	const vote = args.cancel
		? activeVotesByLobbyCode.get(lobby.code)
		: getOrCreateActiveVote(client)
	if (!vote) return

	const clientKey = normalizeClientIdentityKey(client)
	if (!vote.participants.some((participant) => participant.key === clientKey)) {
		sendSystemError(client, 'This player is not part of the active co-op save.')
		return
	}

	if (args.cancel) {
		vote.snapshots.delete(clientKey)
		broadcastVoteStatus(lobby, vote)
		clearEmptyVote(lobby, vote)
		return
	}

	if (!args.runData || !args.mpStateData) {
		sendSystemError(client, 'Co-op save snapshot was incomplete.')
		return
	}

	vote.snapshots.set(clientKey, {
		runData: args.runData,
		mpStateData: args.mpStateData,
		score: args.score,
		handsLeft: args.handsLeft,
	})
	vote.metadata = mergeMetadata(vote.metadata, args)

	if (vote.snapshots.size >= vote.participants.length) {
		const save = commitCompletedVote(lobby, vote)
		broadcastVoteStatus(lobby, vote, save)
		closeSavedRunLobby(lobby)
		return
	}

	broadcastVoteStatus(lobby, vote)
}

const getJoinedRestoreParticipantKeys = (lobby: Lobby): Set<string> => {
	const keys = new Set<string>()
	for (const player of lobby.getPlayers()) {
		keys.add(normalizeClientIdentityKey(player))
	}
	return keys
}

const isRestoreReadyToStart = (
	restore: ActiveCoopSaveRestore,
): boolean => {
	const joinedKeys = getJoinedRestoreParticipantKeys(restore.lobby)
	return restore.save.players.every((player) =>
		joinedKeys.has(getCoopSaveIdentityKey(player.name)),
	)
}

const startCoopSavedRun = (restore: ActiveCoopSaveRestore) => {
	const { lobby, save } = restore
	if (lobby.isInGame) return

	lobby.clearEndGameSnapshots()
	lobby.teamState.clearSyncCaches()
	resetLobbyAnteTimer(lobby)
	lobby.anteTimer.clearForgiveness()
	lobby.isInGame = true
	refreshLobbyNemesisAssignmentsForLobby(lobby)

	for (const player of lobby.getPlayers()) {
		preparePlayerForMatchStart(player)
		const participantKey = normalizeClientIdentityKey(player)
		const snapshot = save.snapshots[participantKey]
		if (!snapshot) continue

		restoreSavedPlayerBlindProgress(player, snapshot)
		restorePlayerActiveCoopBlindState(player)
		sendCoopSaveServerAction(player, {
			action: 'startCoopSave',
			saveId: save.saveId,
			runData: snapshot.runData,
			mpStateData: snapshot.mpStateData,
			options: save.options,
		})
	}

	broadcastLobbyInfo(lobby)
	for (const player of lobby.getPlayers()) {
		sendLobbyMatchStateToPlayer(lobby, player)
	}
	activeRestoresBySaveId.delete(save.saveId)
}

const attachClientToRestoreLobby = (
	restore: ActiveCoopSaveRestore,
	client: Client,
) => {
	const { lobby } = restore
	const clientKey = normalizeClientIdentityKey(client)
	const joinedKeys = getJoinedRestoreParticipantKeys(lobby)

	if (joinedKeys.has(clientKey)) {
		sendSystemError(client, 'This saved co-op run already has that player.')
		return
	}

	if (lobby.getPlayerCount() >= getLobbyMaxPlayers(lobby)) {
		sendSystemError(client, 'Saved co-op lobby is full.')
		return
	}

	lobby.attachFreshClient(client)
	preparePlayerForCoopSaveRestoreLobby(lobby, client)
	sendInitialLobbyJoinedState(lobby, client)
}

const createRestoreLobby = (
	save: CoopSaveRecordWirePayload,
	client: Client,
): ActiveCoopSaveRestore => {
	const lobby = new Lobby(client, 'coop', 'coop')
	lobby.coopSaveId = save.saveId
	applyLobbyOptions(lobby, {
		...save.options,
		gamemode: 'gamemode_mp_coop',
		max_players: save.players.length,
	}, false)
	lobby.setOption('max_players', save.players.length)
	preparePlayerForCoopSaveRestoreLobby(lobby, client)
	sendInitialLobbyJoinedState(lobby, client)

	const restore = { save, lobby }
	activeRestoresBySaveId.set(save.saveId, restore)
	return restore
}

export const resumeCoopSaveAction = (
	{ save }: ActionHandlerArgs<ActionResumeCoopSave>,
	client: Client,
) => {
	if (client.lobby) {
		sendSystemError(client, 'Leave the current lobby before resuming a co-op save.')
		return
	}

	const participantKeys = save ? getSaveParticipantKeys(save) : null
	if (!participantKeys) {
		sendSystemError(client, 'Saved co-op run was not found.')
		return
	}

	const clientKey = normalizeClientIdentityKey(client)
	if (!participantKeys.has(clientKey)) {
		sendSystemError(client, 'This saved co-op run belongs to different players.')
		return
	}

	let restore = activeRestoresBySaveId.get(save.saveId)
	if (restore && restore.lobby.getPlayerCount() === 0) {
		activeRestoresBySaveId.delete(save.saveId)
		restore = undefined
	}
	restore = restore ?? createRestoreLobby(save, client)
	if (!restore.lobby.getPlayer(client.id)) {
		attachClientToRestoreLobby(restore, client)
	}
}

export const startCoopSavedRunAction = (lobby: Lobby, client: Client) => {
	if (!lobby.coopSaveId) return false

	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can start the saved co-op run.')
		return true
	}

	const restore = activeRestoresBySaveId.get(lobby.coopSaveId)
	if (!restore) {
		sendSystemError(client, 'Saved co-op run was not found.')
		return true
	}

	if (!isRestoreReadyToStart(restore)) {
		sendSystemError(
			client,
			'Waiting for every saved co-op player to rejoin.',
		)
		return true
	}

	startCoopSavedRun(restore)
	return true
}

export const canClientJoinCoopSaveLobby = (
	lobby: Lobby,
	client: Client,
): boolean => {
	if (!lobby.coopSaveId) return true

	const restore = activeRestoresBySaveId.get(lobby.coopSaveId)
	if (!restore) return false

	const clientKey = normalizeClientIdentityKey(client)
	return restore.save.players.some((player) =>
		getCoopSaveIdentityKey(player.name) === clientKey,
	)
}
