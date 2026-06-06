import type Lobby from '../Lobby.js'
import {
	broadcastLobbyActionExcept,
	broadcastLobbyInfo,
} from '../lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from '../lobbyNemesis.js'
import { getLobbyTeamLives } from '../lobbyPlayerState/queries.js'
import { leaveLobbyClient } from '../lobbyDeparture.js'
import { removeLobbyByCode } from '../lobbyRegistry.js'
import { buildJoinedLobbyAction } from '../lobbySnapshots/actions.js'
import {
	clearPendingBlindReadyState,
	clearPlayerCoopBlindState,
	clearPlayerFirstReadyState,
} from '../playerState.js'
import {
	sendLobbyServerAction,
	sendMatchServerAction,
} from '../protocol/v2/index.js'
import {
	buildSavedGameState,
	restoreSavedGameState,
} from './savedState.js'
import type Client from '../Client.js'
import type { SavedGameState } from './shared.js'

type ResolvedTeamBlindRejoinState = {
	lost: boolean
}

export const applyResolvedTeamBlindStateOnRejoin = (
	lobby: Lobby,
	client: Client,
	savedState: SavedGameState,
): ResolvedTeamBlindRejoinState | null => {
	if (
		lobby.lobbyType !== 'teams' ||
		!savedState.isInMatch ||
		!savedState.coopBlindActive
	) {
		return null
	}

	const teamId = client.team ?? 1
	if (!lobby.teamState.hasResolvedCoopTeam(teamId)) {
		return null
	}

	const currentTeamLives = getLobbyTeamLives(lobby, teamId)
	client.lives = currentTeamLives
	clearPlayerFirstReadyState(client)
	clearPlayerCoopBlindState(client)
	clearPendingBlindReadyState(client)

	return {
		lost: currentTeamLives < savedState.lives,
	}
}

export const sendResolvedTeamBlindEndOnRejoin = (
	client: Client,
	resolvedTeamBlindState: ResolvedTeamBlindRejoinState | null,
) => {
	if (!resolvedTeamBlindState) {
		return
	}

	sendMatchServerAction(client, {
		action: 'endPvP',
		lost: resolvedTeamBlindState.lost,
	})
}

const restoreDisconnectedLobbyClient = (
	lobby: Lobby,
	client: Client,
	savedState: SavedGameState,
) => {
	if (client.lobby && client.lobby !== lobby) {
		leaveLobbyClient(client.lobby, client, removeLobbyByCode)
	}

	restoreSavedGameState(client, savedState)

	lobby.addPlayer(client)
	client.lobby = lobby

	if (client.isOwner) {
		lobby.setOwner(client.id)
	}
}

const notifyLobbyRejoin = (lobby: Lobby, client: Client) => {
	sendLobbyServerAction(
		client,
		buildJoinedLobbyAction(lobby, client, 'rejoinedLobby'),
	)

	broadcastLobbyActionExcept(lobby, client.id, {
		action: 'enemyReconnected',
		playerId: client.id,
		username: client.username,
	})

	broadcastLobbyInfo(lobby)
}

export const rejoinLobbyClient = (
	lobby: Lobby,
	newClient: Client,
	reconnectToken: string,
): SavedGameState | null => {
	const slot = lobby.findDisconnectedSlot(
		(disconnectedSlot) =>
			disconnectedSlot.savedState.reconnectToken === reconnectToken,
	)

	const activeClient = slot
		? undefined
		: lobby.getPlayers().find(
				(player) =>
					player.id !== newClient.id &&
					player.reconnectToken === reconnectToken,
			)

	let savedState: SavedGameState
	if (slot) {
		savedState = slot.savedState
	} else {
		if (!activeClient) return null
		savedState = buildSavedGameState(activeClient)
	}
	if (newClient.lobby === lobby && newClient.id !== savedState.id) {
		return null
	}

	if (slot) {
		clearTimeout(slot.timer)
		lobby.deleteDisconnectedSlot(savedState.id)
	} else if (activeClient) {
		lobby.removePlayer(activeClient.id)
		activeClient.lobby = null
	}

	restoreDisconnectedLobbyClient(lobby, newClient, savedState)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	notifyLobbyRejoin(lobby, newClient)
	return savedState
}
