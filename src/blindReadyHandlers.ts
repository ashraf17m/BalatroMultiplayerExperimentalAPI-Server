import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionReadyBlind,
	ActionStartBlind,
	BlindKind,
	BlindRow,
} from './actions.js'
import {
	blindReadySatisfied,
	hasDisconnectedMatchBlocker,
	hasDisconnectedTeamBlindBlocker,
	isBlindKindValidForRow,
	isPlayerReadyForPvpBlind,
	normalizeBlindKind,
	normalizeBlindRow,
} from './blindRules.js'
import { SPEEDRUN_REWARD_WINDOW_MS } from './constants.js'
import { pauseLobbyAnteTimerForControllerRelease } from './lobbyAnteTimerBroadcasts.js'
import { resetLobbyAnteTimer } from './lobbyAnteTimer.js'
import { broadcastLobbyMatchPlayerStates } from './lobbyPlayerState/broadcasts.js'
import {
	getEnemies,
	getLobbyActivePlayers,
	isPlayerExcludedFromActiveMatch,
} from './lobbyPlayerState/queries.js'
import {
	clearPendingBlindReadyState,
	markPlayerReadyForBlind,
	markPlayerFirstReadyForBlind,
	preparePlayerForStartedBlind,
} from './playerState.js'
import { sendMatchServerAction, sendSystemError } from './protocol/v2/index.js'
import { isCoopLobbyType, isDuelsLobbyType } from './lobbyTypes.js'
import {
	ensureDuelRound,
	hasDuelByeResult,
} from './lobbyDuelCoordinator.js'
import { lobbyUsesSharedSyncGroup } from './sharedSyncGroups.js'
import { startTeamCoopBlindIfReady } from './teamBlindFlowHandlers.js'

const resetPlayersForStartedBlind = (players: Client[]) => {
	for (const player of players) {
		preparePlayerForStartedBlind(player)
	}
}

const getReadyBlindStates = (players: Client[]) =>
	new Map(
		players.map((player) => [
			player.id,
			{
				blindRow: player.readyBlindRow,
				blindKind: player.readyBlindKind,
			},
		]),
	)

const buildStartBlindAction = (
	lobby: NonNullable<Client['lobby']>,
	player: Client,
	readyBlindStates: Map<
		string,
		{ blindRow: BlindRow | null; blindKind: BlindKind | null }
	>,
): ActionStartBlind => {
	const readyBlind = readyBlindStates.get(player.id)
	const action: ActionStartBlind = { action: 'startBlind' }

	if (readyBlind?.blindRow) {
		action.blindRow = readyBlind.blindRow
	}
	if (readyBlind?.blindKind) {
		action.blindKind = readyBlind.blindKind
	}
	if (isDuelsLobbyType(lobby.lobbyType)) {
		action.duelRole = lobby.duelState.isBye(player.id) ? 'bye' : 'pair'
	}

	return action
}

const pauseAnteTimerForUnreadyController = (client: Client) => {
	const lobby = client.lobby
	if (
		!lobby ||
		lobby.anteTimer.controllerId !== client.id
	) {
		return
	}

	pauseLobbyAnteTimerForControllerRelease(lobby, client.id)
}

const broadcastGlobalBlindStart = (lobby: Client['lobby']) => {
	if (!lobby) {
		return false
	}

	const activePlayers = getLobbyActivePlayers(lobby)
	if (activePlayers.length === 0) {
		return false
	}

	ensureDuelRound(lobby)
	const readyBlindStates = getReadyBlindStates(activePlayers)
	resetLobbyAnteTimer(lobby)

	const firstReadyAt = lobby.firstReadyAt
	if (firstReadyAt && Date.now() - firstReadyAt <= SPEEDRUN_REWARD_WINDOW_MS) {
		for (const player of activePlayers) {
			if (!player.firstReady) {
				sendMatchServerAction(player, { action: 'speedrun' })
			}
		}
	}
	lobby.firstReadyAt = null

	resetPlayersForStartedBlind(activePlayers)
	lobby.teamState.clearBlindTargets()
	lobby.teamState.clearLifeBlockers()
	lobby.teamState.clearResolvedCoopTeams()

	for (const player of activePlayers) {
		sendMatchServerAction(
			player,
			buildStartBlindAction(lobby, player, readyBlindStates),
		)
	}
	broadcastLobbyMatchPlayerStates(lobby, activePlayers)

	return true
}

const tryStartPendingPvpBlindIfReady = (
	lobby: Client['lobby'],
): boolean => {
	if (!lobby || hasDisconnectedMatchBlocker(lobby)) {
		return false
	}

	const activePlayers = getLobbyActivePlayers(lobby)
	if (activePlayers.length === 0) {
		return false
	}

	const readyStarter = activePlayers.find(
		isPlayerReadyForPvpBlind,
	)
	if (!readyStarter || !readyStarter.readyBlindRow) {
		return false
	}

	if (
		!blindReadySatisfied(lobby, readyStarter, readyStarter.readyBlindRow, 'pvp')
	) {
		return false
	}

	return broadcastGlobalBlindStart(lobby)
}

const isPendingGroupedBlindStarter = (player: Client) =>
	player.isReady &&
	player.readyBlindKind != null &&
	player.readyBlindKind !== 'pvp' &&
	player.readyBlindRow != null

const hasDisconnectedGroupedBlindBlocker = (
	lobby: NonNullable<Client['lobby']>,
	player: Client,
) => {
	if (!lobbyUsesSharedSyncGroup(lobby)) {
		return false
	}

	return isCoopLobbyType(lobby.lobbyType)
		? hasDisconnectedMatchBlocker(lobby)
		: hasDisconnectedTeamBlindBlocker(lobby, player.team ?? 1)
}

const tryStartPendingGroupedBlindIfReady = (
	lobby: Client['lobby'],
): boolean => {
	if (!lobby) {
		return false
	}

	if (!lobbyUsesSharedSyncGroup(lobby)) {
		return false
	}

	const readyStarter = getLobbyActivePlayers(lobby).find(
		isPendingGroupedBlindStarter,
	)
	if (
		!readyStarter ||
		!readyStarter.readyBlindRow ||
		!readyStarter.readyBlindKind
	) {
		return false
	}

	if (hasDisconnectedGroupedBlindBlocker(lobby, readyStarter)) {
		return false
	}

	if (
		!blindReadySatisfied(
			lobby,
			readyStarter,
			readyStarter.readyBlindRow,
			readyStarter.readyBlindKind,
		)
	) {
		return false
	}

	return startTeamCoopBlindIfReady(readyStarter, readyStarter.readyBlindKind)
}

export const tryStartPendingBlindIfReady = (
	lobby: Client['lobby'],
): boolean => {
	return (
		tryStartPendingPvpBlindIfReady(lobby) ||
		tryStartPendingGroupedBlindIfReady(lobby)
	)
}

export const readyBlindAction = (
	{
		blindRow,
		blindKind,
		handsLeft,
		blindTarget,
	}: ActionHandlerArgs<ActionReadyBlind>,
	client: Client,
) => {
	const [lobby] = getEnemies(client)
	if (!lobby) return
	if (!client.isInMatch) return
	if (hasDuelByeResult(lobby, client)) return
	const normalizedBlindRow = normalizeBlindRow(blindRow)
	const normalizedBlindKind = normalizeBlindKind(blindKind)
	if (
		!normalizedBlindRow ||
		!normalizedBlindKind ||
		!isBlindKindValidForRow(normalizedBlindRow, normalizedBlindKind)
	) {
		sendSystemError(client, 'Invalid blind ready target.')
		return
	}

	markPlayerReadyForBlind(client, {
		row: normalizedBlindRow,
		kind: normalizedBlindKind,
		handsLeft,
		blindTarget,
	})
	ensureDuelRound(lobby)

	const allReady = blindReadySatisfied(
		lobby,
		client,
		normalizedBlindRow,
		normalizedBlindKind,
	)
	const isGroupedLobby = Boolean(lobbyUsesSharedSyncGroup(lobby))
	const activeEnemies = getLobbyActivePlayers(lobby).filter(
		(player) => player.id !== client.id,
	)

	if (
		!isGroupedLobby &&
		!client.firstReady &&
		activeEnemies.every((enemy) => !enemy.isReady && !enemy.firstReady)
	) {
		markPlayerFirstReadyForBlind(client)
		lobby.firstReadyAt = Date.now()
		sendMatchServerAction(client, { action: 'speedrun' })
	}

	if (!allReady) {
		return
	}

	if (
		normalizedBlindKind !== 'pvp' &&
		hasDisconnectedGroupedBlindBlocker(lobby, client)
	) {
		return
	}

	if (startTeamCoopBlindIfReady(client, normalizedBlindKind)) {
		return
	}

	if (
		(normalizedBlindKind === 'pvp' || isDuelsLobbyType(lobby.lobbyType)) &&
		hasDisconnectedMatchBlocker(lobby)
	) {
		return
	}

	broadcastGlobalBlindStart(lobby)
}

export const unreadyBlindAction = (client: Client) => {
	const lobby = client.lobby
	if (lobby && isPlayerExcludedFromActiveMatch(lobby, client)) {
		return
	}
	pauseAnteTimerForUnreadyController(client)
	clearPendingBlindReadyState(client)
}
