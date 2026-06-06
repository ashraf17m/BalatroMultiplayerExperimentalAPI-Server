import type Lobby from '../Lobby.js'
import type Client from '../Client.js'
import type { LobbyPlayerWirePayload } from '../actions.js'
import type { DisconnectedSlot } from '../lobbyReconnect/shared.js'
import { lobbyRequiresReady } from '../lobbyRules.js'

const DISCONNECTED_LOCATION = 'loc_disconnected'

const buildPlayerInfo = (
	player: Client | DisconnectedSlot['savedState'],
	includeLobbyReady: boolean,
	isDisconnected: boolean,
): LobbyPlayerWirePayload => {
	return {
		id: player.id,
		username: player.username,
		blindCol: player.blindCol,
		nemesisPlayerId: player.nemesisPlayerId ?? undefined,
		location: isDisconnected ? DISCONNECTED_LOCATION : player.location,
		modHash: player.modHash,
		isCached: player.isCached,
		...(includeLobbyReady ? { isReadyLobby: player.isReadyLobby } : {}),
		isOwner: player.isOwner,
		team: player.team ?? undefined,
		isTeamLocked: player.isTeamLocked,
		isInMatch: player.isInMatch,
		isDisconnected,
		lives: player.lives,
	}
}

export const buildLobbyPlayerInfo = (
	lobby: Lobby,
	player: Client,
): LobbyPlayerWirePayload => {
	return buildPlayerInfo(player, lobbyRequiresReady(lobby), false)
}

export const buildPlayersInfo = (lobby: Lobby): LobbyPlayerWirePayload[] => {
	const players = lobby.getPlayers()
	const includeLobbyReady = lobbyRequiresReady(lobby)

	const connectedPlayers = players.map((player) =>
		buildPlayerInfo(player, includeLobbyReady, false),
	)
	const disconnectedPlayers = lobby.getDisconnectedSlots().map((slot) =>
		buildPlayerInfo(slot.savedState, includeLobbyReady, true),
	)

	return [...connectedPlayers, ...disconnectedPlayers]
}
