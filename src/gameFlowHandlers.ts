import type Client from './Client.js'
import type { ActionHandlerArgs, ActionLobbyOptions } from './actions.js'
import { STARTING_LIVES_BY_GAME_MODE } from './gameModes.js'
import { clearDuelMatchState, startDuelRound } from './lobbyDuelCoordinator.js'
import { resetLobbyAnteTimer } from './lobbyAnteTimer.js'
import {
	broadcastLobbyAction,
	broadcastLobbyInfo,
	broadcastLobbyNemesisAssignments,
} from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { applyLobbyOptions } from './lobbyOptionUpdates.js'
import { setLobbyPlayersLives } from './lobbyPlayerState/lives.js'
import {
	getLobbyStartBlockReason,
	lobbyRequiresReady,
} from './lobbyRules.js'
import { preparePlayerForMatchStart } from './playerState.js'
import { sendSystemError } from './protocol/v2/index.js'
import { startCoopSavedRunAction } from './coopSaveHandlers.js'

const generateSeed = (length = 8) => {
	let result = ''
	const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'
	for (let counter = 0; counter < length; counter++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}

export const startGameAction = (client: Client) => {
	const lobby = client.lobby

	if (!lobby || !client.isOwner) {
		return
	}

	if (lobby.coopSaveId) {
		startCoopSavedRunAction(lobby, client)
		return
	}

	const startBlockReason = getLobbyStartBlockReason(lobby)
	if (startBlockReason !== null) {
		sendSystemError(
			client,
			startBlockReason === 'match_in_progress'
				? 'Waiting for match to finish.'
				: startBlockReason === 'waiting_for_teams'
				  ? 'Assign players to at least two teams before starting.'
				  : 'Lobby is not ready to start yet.',
		)
		return
	}

	const lives = lobby.options.starting_lives
		? Number.parseInt(String(lobby.options.starting_lives), 10)
		: STARTING_LIVES_BY_GAME_MODE[lobby.gameMode]

	lobby.clearEndGameSnapshots()
	lobby.teamState.clearSyncCaches()
	clearDuelMatchState(lobby)

	for (const player of lobby.getPlayers()) {
		preparePlayerForMatchStart(player)
	}

	lobby.isInGame = true
	const startedDuelRound = startDuelRound(lobby)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	resetLobbyAnteTimer(lobby)
	lobby.anteTimer.clearForgiveness()
	if (startedDuelRound) {
		broadcastLobbyNemesisAssignments(lobby)
	}
	broadcastLobbyAction(lobby, {
		action: 'startGame',
		deck: 'c_multiplayer_1',
		seed: lobby.options.different_seeds ? undefined : generateSeed(),
	})

	setLobbyPlayersLives(lobby, lives)

	if (lobbyRequiresReady(lobby)) {
		for (const player of lobby.getPlayers()) {
			if (!player.isOwner) {
				player.isReadyLobby = false
			}
		}
	}

	broadcastLobbyInfo(lobby)
}

export const lobbyOptionsAction = (
	{ options }: ActionHandlerArgs<ActionLobbyOptions>,
	client: Client,
) => {
	if (!client.lobby) {
		return
	}

	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can change lobby options.')
		return
	}

	if (client.lobby.isInGame) {
		sendSystemError(client, 'Lobby options are locked once the match starts.')
		return
	}

	if (client.lobby.coopSaveId) {
		sendSystemError(client, 'Saved co-op lobby options are locked.')
		return
	}

	applyLobbyOptions(client.lobby, options ?? {})
}
