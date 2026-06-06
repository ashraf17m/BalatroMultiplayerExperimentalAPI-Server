import type Lobby from './Lobby.js'
import {
	buildLobbyAnteTimerAction,
	releaseLobbyAnteTimerController,
} from './lobbyAnteTimer.js'
import { broadcastLobbyMatchAction } from './lobbyBroadcasts.js'

export const pauseLobbyAnteTimerForControllerRelease = (
	lobby: Lobby,
	controllerId: string,
	options: {
		excludedPlayerId?: string
	} = {},
) => {
	const shouldBroadcastPause = releaseLobbyAnteTimerController(
		lobby,
		controllerId,
	)
	if (shouldBroadcastPause) {
		broadcastLobbyMatchAction(lobby, buildLobbyAnteTimerAction(lobby), {
			excludedPlayerId: options.excludedPlayerId,
		})
	}
	return shouldBroadcastPause
}
