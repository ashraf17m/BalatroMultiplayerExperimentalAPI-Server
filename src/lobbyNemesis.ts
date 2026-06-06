import type Lobby from './Lobby.js'
import type Client from './Client.js'
import type { LobbyType } from './actions.js'
import { syncDuelNemesisAssignmentsForLobby } from './lobbyDuelCoordinator.js'
import { isDuelsLobbyType } from './lobbyTypes.js'

const stableNemesisHash = (value: string): number => {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

const isValidNemesisCandidate = (
	lobbyType: LobbyType,
	player: Client,
	candidate: Client | null | undefined,
	requireActive: boolean,
): candidate is Client => {
	if (!candidate || candidate.id === player.id) {
		return false
	}

	if (requireActive && !candidate.isInMatch) {
		return false
	}

	if (lobbyType === 'teams') {
		const playerTeam = player.team ?? 1
		const candidateTeam = candidate.team ?? 1
		if (playerTeam === candidateTeam) {
			return false
		}
	}

	return true
}

const getNemesisCandidatesForPlayer = (
	players: ReadonlyMap<string, Client>,
	lobbyType: LobbyType,
	player: Client,
	requireActive: boolean,
): Client[] => {
	return Array.from(players.values()).filter((candidate) =>
		isValidNemesisCandidate(lobbyType, player, candidate, requireActive),
	)
}

const selectNemesisForPlayer = (
	lobbyCode: string,
	player: Client,
	candidates: Client[],
): Client | null => {
	if (candidates.length === 0) {
		return null
	}

	const rankedCandidates = [...candidates].sort((a, b) => {
		const scoreA = stableNemesisHash(`${lobbyCode}:${player.id}:${a.id}`)
		const scoreB = stableNemesisHash(`${lobbyCode}:${player.id}:${b.id}`)
		if (scoreA !== scoreB) {
			return scoreA - scoreB
		}

		return a.id.localeCompare(b.id)
	})

	return rankedCandidates[0] ?? null
}

export const refreshLobbyNemesisAssignments = (
	lobbyCode: string,
	lobbyType: LobbyType,
	players: ReadonlyMap<string, Client>,
	requireActive: boolean,
): void => {
	if (isDuelsLobbyType(lobbyType)) {
		return
	}

	for (const player of players.values()) {
		const currentNemesis = player.nemesisPlayerId
			? players.get(player.nemesisPlayerId) ?? null
			: null

		if (
			isValidNemesisCandidate(lobbyType, player, currentNemesis, requireActive)
		) {
			continue
		}

		const replacement = selectNemesisForPlayer(
			lobbyCode,
			player,
			getNemesisCandidatesForPlayer(players, lobbyType, player, requireActive),
		)
		player.nemesisPlayerId = replacement ? replacement.id : null
	}
}

export const refreshLobbyNemesisAssignmentsForLobby = (lobby: Lobby): void => {
	if (syncDuelNemesisAssignmentsForLobby(lobby)) {
		return
	}

	refreshLobbyNemesisAssignments(
		lobby.code,
		lobby.lobbyType,
		lobby.getPlayerMap(),
		lobby.isInGame,
	)
}
