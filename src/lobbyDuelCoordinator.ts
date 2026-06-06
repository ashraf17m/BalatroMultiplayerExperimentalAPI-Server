import type Lobby from './Lobby.js'
import type Client from './Client.js'
import type { InsaneInt } from './InsaneInt.js'
import { getLobbyActivePlayers } from './lobbyPlayerState/queries.js'
import { isDuelsLobbyType } from './lobbyTypes.js'
import { broadcastLobbyNemesisAssignments } from './lobbyBroadcasts.js'

export const syncDuelNemesisAssignmentsForLobby = (lobby: Lobby) => {
	if (!isDuelsLobbyType(lobby.lobbyType)) {
		return false
	}

	for (const player of lobby.getPlayers()) {
		player.nemesisPlayerId = player.isInMatch
			? lobby.duelState.getOpponentId(player.id)
			: null
	}

	return true
}

export const startDuelRound = (
	lobby: Lobby,
	options: { broadcast?: boolean } = {},
) => {
	if (!isDuelsLobbyType(lobby.lobbyType)) {
		return false
	}

	lobby.duelState.beginRound(lobby.code, getLobbyActivePlayers(lobby))
	syncDuelNemesisAssignmentsForLobby(lobby)

	if (options.broadcast) {
		broadcastLobbyNemesisAssignments(lobby)
	}

	return true
}

export const ensureDuelRound = (lobby: Lobby) => {
	if (!isDuelsLobbyType(lobby.lobbyType) || lobby.duelState.hasRound()) {
		return false
	}

	return startDuelRound(lobby, { broadcast: true })
}

export const clearDuelMatchState = (lobby: Lobby) => {
	lobby.duelState.clearMatchState()
}

export const isDuelByePlayer = (lobby: Lobby, player: Client) =>
	isDuelsLobbyType(lobby.lobbyType) && lobby.duelState.isBye(player.id)

export const setDuelByeBlindTarget = (
	lobby: Lobby,
	player: Client,
	blindTarget: InsaneInt,
) => {
	if (!isDuelByePlayer(lobby, player)) {
		return false
	}

	lobby.duelState.setBlindTarget(player.id, blindTarget)
	return true
}

export const didDuelByeBeatBlindTarget = (lobby: Lobby, player: Client) => {
	const blindTarget = lobby.duelState.getBlindTarget(player.id)
	return !!blindTarget && !player.score.lessThan(blindTarget)
}

export const hasDuelByeResult = (lobby: Lobby, player: Client) =>
	isDuelByePlayer(lobby, player) && lobby.duelState.hasByeResult(player.id)

export const getDuelByeResult = (lobby: Lobby, player: Client) =>
	isDuelByePlayer(lobby, player)
		? lobby.duelState.getByeResult(player.id)
		: undefined

export const markDuelByeResult = (
	lobby: Lobby,
	player: Client,
	won: boolean,
) => {
	if (!isDuelByePlayer(lobby, player)) {
		return false
	}

	lobby.duelState.setByeResult(player.id, won)
	return true
}

export const isDuelByeResolved = (lobby: Lobby, player: Client) =>
	!isDuelByePlayer(lobby, player) ||
	hasDuelByeResult(lobby, player) ||
	didDuelByeBeatBlindTarget(lobby, player) ||
	player.handsLeft <= 0
