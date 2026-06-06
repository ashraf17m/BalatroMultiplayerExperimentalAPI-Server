import type Client from './Client.js'
import type { ActionHandlerArgs, ActionSetLobbyType } from './actions.js'
import {
	broadcastLobbyAction,
	broadcastLobbyTypeChanged,
} from './lobbyBroadcasts.js'
import {
	getLobbyTypeChangeOptionUpdates,
	type LobbyOptions,
} from './lobbyOptions.js'
import {
	isCoopLobbyType,
	isHeadToHeadLobbyType,
	isValidLobbyType,
} from './lobbyTypes.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { resetLobbyPlayersForLobbyTypeChange } from './lobbyTypeState.js'
import { sendSystemError } from './protocol/v2/index.js'

export const setLobbyTypeAction = (
	{ lobbyType }: ActionHandlerArgs<ActionSetLobbyType>,
	client: Client,
) => {
	const lobby = client.lobby
	if (!lobby) {
		return
	}

	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can change the lobby type.')
		return
	}

	if (lobby.isInGame) {
		sendSystemError(client, 'Lobby type is locked once the match starts.')
		return
	}

	if (lobby.coopSaveId) {
		sendSystemError(client, 'Saved co-op lobby options are locked.')
		return
	}

	if (
		!isValidLobbyType(lobbyType) ||
		isCoopLobbyType(lobbyType) ||
		isCoopLobbyType(lobby.lobbyType)
	) {
		sendSystemError(client, 'Only party lobby types can be switched here.')
		return
	}

	if (lobby.gameMode === 'coop') {
		sendSystemError(client, 'Co-op lobby type is controlled by co-op mode.')
		return
	}

	if (isHeadToHeadLobbyType(lobbyType) && lobby.getPlayerCount() > 2) {
		sendSystemError(client, '1v1 lobbies support 2 players max.')
		return
	}

	if (lobby.lobbyType === lobbyType) {
		return
	}

	const previousLobbyType = lobby.lobbyType
	lobby.lobbyType = lobbyType
	const optionUpdates: LobbyOptions = getLobbyTypeChangeOptionUpdates(
		previousLobbyType,
		lobbyType,
	)
	for (const [key, value] of Object.entries(optionUpdates)) {
		if (value !== undefined) {
			lobby.setOption(key, value)
		}
	}

	resetLobbyPlayersForLobbyTypeChange(lobby)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	if (Object.keys(optionUpdates).length > 0) {
		broadcastLobbyAction(lobby, {
			action: 'lobbyOptions',
			options: optionUpdates,
		})
	}
	broadcastLobbyTypeChanged(lobby)
}
