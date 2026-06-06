import type Lobby from '../Lobby.js'
import type Client from '../Client.js'
import { tryStartPendingBlindIfReady } from '../blindReadyHandlers.js'
import { pauseLobbyAnteTimerForControllerRelease } from '../lobbyAnteTimerBroadcasts.js'
import {
	broadcastLobbyAction,
	broadcastLobbyInfo,
} from '../lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from '../lobbyNemesis.js'
import { leaveLobbyClient } from '../lobbyDeparture.js'
import { removeLobbyByCode } from '../lobbyRegistry.js'
import { buildSavedGameState } from './savedState.js'
import { RECONNECT_GRACE_PERIOD } from './shared.js'

const expireDisconnectedLobbyClient = (lobby: Lobby, client: Client) => {
	console.log(`Reconnect grace period expired for lobby ${lobby.code}`)
	lobby.deleteDisconnectedSlot(client.id)
	leaveLobbyClient(lobby, client, removeLobbyByCode)
	tryStartPendingBlindIfReady(lobby)
}

const reserveDisconnectedLobbyClient = (lobby: Lobby, client: Client) => {
	console.log(
		`Player ${client.id} disconnected from lobby ${
			lobby.code
		}, reserving slot for ${
			RECONNECT_GRACE_PERIOD / 1000
		}s (saving state: lives=${client.lives}, score=${client.score}, ante=${
			client.ante
		})`,
	)

	const timer = setTimeout(() => {
		expireDisconnectedLobbyClient(lobby, client)
	}, RECONNECT_GRACE_PERIOD)

	lobby.setDisconnectedSlot(client.id, {
		timer,
		savedState: buildSavedGameState(client),
	})
}

const notifyLobbyDisconnect = (lobby: Lobby, client: Client) => {
	broadcastLobbyAction(lobby, {
		action: 'enemyDisconnected',
		username: client.username,
		timeout: RECONNECT_GRACE_PERIOD / 1000,
		playerId: client.id,
	})
	broadcastLobbyInfo(lobby)
}

export const disconnectLobbyClient = (lobby: Lobby, client: Client) => {
	if (!lobby.hasPlayer(client.id)) return

	if (!lobby.isInGame || lobby.getPlayerCount() <= 1) {
		leaveLobbyClient(lobby, client, removeLobbyByCode)
		return
	}

	pauseLobbyAnteTimerForControllerRelease(lobby, client.id, {
		excludedPlayerId: client.id,
	})
	reserveDisconnectedLobbyClient(lobby, client)
	lobby.removePlayer(client.id)
	client.lobby = null
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	notifyLobbyDisconnect(lobby, client)
}
