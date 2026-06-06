import type Lobby from './Lobby.js'
import { clearCoopSaveVoteForLobby } from './coopSaveHandlers.js'
import { clearDuelMatchState, startDuelRound } from './lobbyDuelCoordinator.js'
import { resetLobbyAnteTimer } from './lobbyAnteTimer.js'
import { broadcastLobbyInfo } from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import {
	getLobbyActivePlayers,
	getLobbyActiveTeamPlayers,
	getLobbyTeamLives,
} from './lobbyPlayerState/queries.js'
import { isDuelsLobbyType } from './lobbyTypes.js'
import { clearPlayerMatchParticipation } from './playerState.js'
import { sendEndgameServerAction } from './protocol/v2/index.js'

const clearPlayersMatchParticipation = (
	players: ReturnType<typeof getLobbyActivePlayers>,
) => {
	for (const player of players) {
		clearPlayerMatchParticipation(player)
	}
}

const shouldSendAloneOutcome = (
	players: ReturnType<typeof getLobbyActivePlayers>,
	winners: ReturnType<typeof getLobbyActivePlayers>,
	losers: ReturnType<typeof getLobbyActivePlayers>,
) =>
	players.length === 1 &&
	winners.length === 1 &&
	losers.length === 0 &&
	players[0]?.id === winners[0]?.id

export const finalizeMatchResults = (
	lobby: Lobby,
	players: ReturnType<typeof getLobbyActivePlayers>,
	options?: {
		winners?: ReturnType<typeof getLobbyActivePlayers>
		losers?: ReturnType<typeof getLobbyActivePlayers>
	},
) => {
	clearCoopSaveVoteForLobby(lobby)
	clearDuelMatchState(lobby)
	resetLobbyAnteTimer(lobby)
	lobby.isInGame = false
	clearPlayersMatchParticipation(players)
	refreshLobbyNemesisAssignmentsForLobby(lobby)

	const winners = options?.winners ?? []
	const losers = options?.losers ?? []
	const winnerAction = shouldSendAloneOutcome(players, winners, losers)
		? 'aloneGame'
		: 'winGame'

	for (const winner of winners) {
		sendEndgameServerAction(winner, { action: winnerAction })
	}

	for (const loser of losers) {
		sendEndgameServerAction(loser, { action: 'loseGame' })
	}

	broadcastLobbyInfo(lobby)
}

const finalizeSoloGameOver = (
	lobby: Lobby,
	players: ReturnType<typeof getLobbyActivePlayers>,
	winner: ReturnType<typeof getLobbyActivePlayers>[number] | undefined,
) => {
	finalizeMatchResults(lobby, players, {
		winners: winner ? [winner] : [],
		losers: players.filter((player) => player.id !== winner?.id),
	})
}

export const isFurthestBlindProgressAhead = (
	candidate: number,
	current: number,
) => candidate > current || (current === 0 && candidate < 0)

const getSurvivalLeaders = (players: ReturnType<typeof getLobbyActivePlayers>) =>
	players.filter((candidate) =>
		players.every(
			(player) =>
				player.id === candidate.id ||
				!isFurthestBlindProgressAhead(
					player.furthestBlind,
					candidate.furthestBlind,
				),
		),
	)

export const resolveSurvivalGameOver = (lobby: Lobby): boolean => {
	if (lobby.gameMode !== 'survival' || !lobby.isInGame) {
		return false
	}

	const players = getLobbyActivePlayers(lobby)
	if (players.length === 0) {
		return false
	}

	const alivePlayers = players.filter((player) => player.lives > 0)
	if (alivePlayers.length > 1) {
		return false
	}

	if (alivePlayers.length === 1) {
		const survivor = alivePlayers[0]
		const deadPlayers = players.filter((player) => player.id !== survivor.id)
		if (
			deadPlayers.length === 0 ||
			!deadPlayers.every((player) => player.lives <= 0) ||
			!deadPlayers.every((player) =>
				isFurthestBlindProgressAhead(
					survivor.furthestBlind,
					player.furthestBlind,
				),
			)
		) {
			return false
		}

		finalizeMatchResults(lobby, players, {
			winners: [survivor],
			losers: deadPlayers,
		})
		return true
	}

	const winners = getSurvivalLeaders(players)
	finalizeMatchResults(lobby, players, {
		winners,
		losers: players.filter(
			(player) => !winners.some((winner) => winner.id === player.id),
		),
	})
	return true
}

export const resolveSoloEliminations = (
	lobby: Lobby,
	options: { deferDuelPairing?: boolean } = {},
): boolean => {
	const players = getLobbyActivePlayers(lobby)
	const alivePlayers = players.filter((player) => player.lives > 0)

	if (alivePlayers.length <= 1) {
		finalizeSoloGameOver(lobby, players, alivePlayers[0])
		return true
	}

	const eliminatedPlayers = players.filter((player) => player.lives <= 0)
	if (eliminatedPlayers.length === 0) {
		return false
	}

	clearPlayersMatchParticipation(eliminatedPlayers)
	if (isDuelsLobbyType(lobby.lobbyType) && !options.deferDuelPairing) {
		startDuelRound(lobby, { broadcast: true })
	} else {
		refreshLobbyNemesisAssignmentsForLobby(lobby)
	}
	for (const player of eliminatedPlayers) {
		sendEndgameServerAction(player, { action: 'loseGame' })
	}
	broadcastLobbyInfo(lobby)
	return true
}

const getAliveTeamIds = (lobby: Lobby) => {
	const aliveTeams = new Set<number>()

	for (const player of getLobbyActivePlayers(lobby)) {
		const teamId = player.team ?? 1
		const teamLives =
			lobby.lobbyType === 'teams'
				? getLobbyTeamLives(lobby, teamId)
				: player.lives
		if (teamLives > 0) {
			aliveTeams.add(teamId)
		}
	}

	return aliveTeams
}

export const resolveTeamsGameOver = (
	lobby: Lobby,
	eliminatedTeamId?: number,
) => {
	const players = getLobbyActivePlayers(lobby)
	const aliveTeams = getAliveTeamIds(lobby)

	if (aliveTeams.size <= 1) {
		const winningTeamId = Array.from(aliveTeams)[0]
		finalizeMatchResults(lobby, players, {
			winners: players.filter(
				(player) =>
					winningTeamId !== undefined && (player.team ?? 1) === winningTeamId,
			),
			losers: players.filter(
				(player) =>
					winningTeamId === undefined || (player.team ?? 1) !== winningTeamId,
			),
		})
		return true
	}

	if (
		eliminatedTeamId !== undefined &&
		getLobbyTeamLives(lobby, eliminatedTeamId) <= 0
	) {
		const teamPlayers = getLobbyActiveTeamPlayers(lobby, eliminatedTeamId)
		clearPlayersMatchParticipation(teamPlayers)
		refreshLobbyNemesisAssignmentsForLobby(lobby)
		for (const player of teamPlayers) {
			sendEndgameServerAction(player, { action: 'loseGame' })
		}

		const remainingAliveTeams = getAliveTeamIds(lobby)
		if (remainingAliveTeams.size <= 1) {
			const winningTeamId = Array.from(remainingAliveTeams)[0]
			finalizeMatchResults(lobby, players, {
				winners: players.filter(
					(player) => (player.team ?? 1) === winningTeamId,
				),
				losers: players.filter(
					(player) =>
						!teamPlayers.some((teamPlayer) => teamPlayer.id === player.id) &&
						(player.team ?? 1) !== winningTeamId,
				),
			})
		}

		if (lobby.isInGame) {
			broadcastLobbyInfo(lobby)
		}
		return true
	}

	return false
}
