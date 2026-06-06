import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionKickPlayer,
	ActionMakePlayerHost,
} from './actions.js'
import { broadcastLobbyInfo } from './lobbyBroadcasts.js'
import { kickLobbyPlayer, leaveLobbyClient } from './lobbyDeparture.js'
import { disconnectLobbyClient } from './lobbyReconnect/disconnect.js'
import { removeLobbyByCode } from './lobbyRegistry.js'
import { sendSystemError } from './protocol/v2/index.js'

export const leaveLobbyAction = (client: Client) => {
	const lobby = client.lobby
	if (!lobby) return

	leaveLobbyClient(lobby, client, removeLobbyByCode)
}

export const kickPlayerAction = (
	{ playerId }: ActionHandlerArgs<ActionKickPlayer>,
	client: Client,
) => {
	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can kick players.')
		return
	}

	const lobby = client.lobby
	if (!lobby) return

	if (lobby.coopSaveId) {
		sendSystemError(client, 'Saved co-op players cannot be kicked.')
		return
	}

	kickLobbyPlayer(lobby, playerId, removeLobbyByCode)
}

export const makePlayerHostAction = (
	{ playerId }: ActionHandlerArgs<ActionMakePlayerHost>,
	client: Client,
) => {
	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can make another player host.')
		return
	}

	const lobby = client.lobby
	if (!lobby) return

	if (lobby.coopSaveId) {
		sendSystemError(client, 'Saved co-op host cannot be changed.')
		return
	}

	if (lobby.setOwner(playerId)) {
		broadcastLobbyInfo(lobby)
	}
}

export const disconnectFromLobbyAction = (client: Client) => {
	const lobby = client.lobby
	if (!lobby) return

	disconnectLobbyClient(lobby, client)
}
