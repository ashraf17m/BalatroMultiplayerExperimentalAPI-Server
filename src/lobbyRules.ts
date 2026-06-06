import type Lobby from './Lobby.js'
import type Client from './Client.js'
import {
	DEFAULT_GROUP_LOBBY_PLAYERS,
	MAX_GROUP_LOBBY_PLAYERS,
	MIN_GROUP_LOBBY_PLAYERS,
} from './constants.js'
import { isHeadToHeadLobbyType, isTeamLobbyType } from './lobbyTypes.js'

type LobbyStartBlockReason =
	| 'match_in_progress'
	| 'waiting_for_players'
	| 'waiting_for_guest_ready'
	| 'waiting_for_teams'
	| null

export const getMinimumGroupMaxPlayers = (lobby: Lobby): number => {
	return Math.max(MIN_GROUP_LOBBY_PLAYERS, lobby.getPlayerCount())
}

export const getLobbyMaxPlayers = (lobby: Lobby): number => {
	if (isHeadToHeadLobbyType(lobby.lobbyType)) {
		return 2
	}

	const configured = Number.parseInt(
		String(lobby.options.max_players ?? DEFAULT_GROUP_LOBBY_PLAYERS),
		10,
	)

	if (!Number.isFinite(configured)) {
		return Math.max(
			DEFAULT_GROUP_LOBBY_PLAYERS,
			getMinimumGroupMaxPlayers(lobby),
		)
	}

	return Math.max(
		getMinimumGroupMaxPlayers(lobby),
		Math.min(MAX_GROUP_LOBBY_PLAYERS, configured),
	)
}

export const lobbyRequiresReady = (lobby: Lobby): boolean => {
	return isHeadToHeadLobbyType(lobby.lobbyType)
}

const getLobbyTeamCount = (
	lobby: Lobby,
	players?: Client[],
): number => {
	const populatedTeams = new Set<number>()
	for (const player of players ?? lobby.getPlayers()) {
		populatedTeams.add(player.team ?? 1)
	}
	return populatedTeams.size
}

export const getLobbyStartBlockReason = (
	lobby: Lobby,
): LobbyStartBlockReason => {
	if (lobby.isInGame) {
		return 'match_in_progress'
	}

	const players = lobby.getPlayers()

	if (lobbyRequiresReady(lobby)) {
		if (players.length !== 2) {
			return 'waiting_for_players'
		}

		return players.every((player) => player.isOwner || player.isReadyLobby)
			? null
			: 'waiting_for_guest_ready'
	}

	if (players.length < 2) {
		return 'waiting_for_players'
	}

	if (
		isTeamLobbyType(lobby.lobbyType) &&
		getLobbyTeamCount(lobby, players) < 2
	) {
		return 'waiting_for_teams'
	}

	return null
}
