import type Client from './Client.js'
import { isTeamLobbyType } from './lobbyTypes.js'
import {
	clearPendingBlindReadyState,
	clearPlayerCoopBlindState,
	clearPlayerFirstReadyState,
} from './playerState.js'

export const resetLobbyPlayersForLobbyTypeChange = (
	lobby: NonNullable<Client['lobby']>,
) => {
	const defaultTeam = isTeamLobbyType(lobby.lobbyType) ? 1 : null
	for (const player of lobby.getPlayers()) {
		player.team = defaultTeam
		player.isReadyLobby = false
		player.isTeamLocked = false
		clearPlayerFirstReadyState(player)
		clearPlayerCoopBlindState(player)
		clearPendingBlindReadyState(player)
	}

	lobby.teamState.clearAll()
	lobby.duelState.clearMatchState()
	lobby.firstReadyAt = null
}
