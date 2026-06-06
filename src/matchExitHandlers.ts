import type Client from './Client.js'
import { setClientLocation } from './clientState.js'
import { clearCoopSaveVoteForLobby } from './coopSaveHandlers.js'
import { pauseLobbyAnteTimerForControllerRelease } from './lobbyAnteTimerBroadcasts.js'
import {
	broadcastLobbyInfo,
} from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { reconcileActiveMatchState } from './matchResolution.js'
import { clearPlayerMatchRunStateForLobbyReturn } from './playerState.js'

const RETURNED_TO_LOBBY_LOCATION = 'Returned to Lobby'

export const returnToLobbyAction = (client: Client) => {
	const lobby = client.lobby
	if (!lobby) return

	if (!client.isInMatch) {
		setClientLocation(client, RETURNED_TO_LOBBY_LOCATION)
		broadcastLobbyInfo(lobby)
		return
	}

	clearCoopSaveVoteForLobby(lobby)
	pauseLobbyAnteTimerForControllerRelease(lobby, client.id)
	clearPlayerMatchRunStateForLobbyReturn(client)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	setClientLocation(client, RETURNED_TO_LOBBY_LOCATION)

	const departureResult = reconcileActiveMatchState(lobby)
	if (departureResult !== 'game_over') {
		broadcastLobbyInfo(lobby)
	}
}
