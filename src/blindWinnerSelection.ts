import type Lobby from './Lobby.js'
import type Client from './Client.js'
import type { InsaneInt } from './InsaneInt.js'
import {
	buildTeamScoreSnapshot,
	highestScore,
	scoreBeatsRuleTarget,
} from './blindScoring.js'
import {
	didDuelByeBeatBlindTarget,
	getDuelByeResult,
	isDuelByePlayer,
} from './lobbyDuelCoordinator.js'
import {
	getLobbyOptionsScoreRule,
	getLobbyCustomWinnerCount,
	type PvpScoreRule,
} from './lobbyOptions.js'
import { isDuelsLobbyType } from './lobbyTypes.js'

const splitPlayersByWinningTeams = (
	players: Client[],
	winningTeamIds: Set<number>,
) => ({
	winners: players.filter((player) => winningTeamIds.has(player.team ?? 1)),
	losers: players.filter((player) => !winningTeamIds.has(player.team ?? 1)),
})

const scoreIsAtLeast = (score: InsaneInt, target: InsaneInt) =>
	score.equalTo(target) || score.greaterThan(target)

const getCustomWinningScore = <T>(
	entries: T[],
	getScore: (entry: T) => InsaneInt,
	winnerCount: number,
) => {
	if (entries.length === 0) {
		return null
	}

	const sortedEntries = [...entries].sort((left, right) => {
		const leftScore = getScore(left)
		const rightScore = getScore(right)
		if (leftScore.equalTo(rightScore)) return 0
		return leftScore.greaterThan(rightScore) ? -1 : 1
	})
	const cutoffIndex = Math.max(0, Math.min(entries.length, winnerCount) - 1)
	return getScore(sortedEntries[cutoffIndex])
}

const resolveWinningTeams = (
	lobby: Lobby,
	players: Client[],
	scoreRule: PvpScoreRule,
) => {
	const { teamScores } = buildTeamScoreSnapshot(players)

	if (scoreRule === 'custom') {
		const teamEntries = Array.from(teamScores.entries())
		const winnerCount = getLobbyCustomWinnerCount(
			lobby.options,
			teamEntries.length,
		)
		const winningScore = getCustomWinningScore(
			teamEntries,
			([, teamScore]) => teamScore,
			winnerCount,
		)
		const winningTeamIds = new Set<number>()
		for (const [teamId, teamScore] of teamEntries) {
			if (winningScore && scoreIsAtLeast(teamScore, winningScore)) {
				winningTeamIds.add(teamId)
			}
		}
		return splitPlayersByWinningTeams(players, winningTeamIds)
	}

	if (scoreRule !== 'highest') {
		const scores = Array.from(teamScores.values())

		const winningTeamIds = new Set<number>()
		for (const [teamId, teamScore] of teamScores.entries()) {
			if (scoreBeatsRuleTarget(teamScore, scores, scoreRule)) {
				winningTeamIds.add(teamId)
			}
		}

		if (winningTeamIds.size === 0) {
			const maxScore = highestScore(teamScores.values())
			for (const [teamId, teamScore] of teamScores.entries()) {
				if (teamScore.equalTo(maxScore)) winningTeamIds.add(teamId)
			}
		}

		return splitPlayersByWinningTeams(players, winningTeamIds)
	}

	const maxTeamScore = highestScore(teamScores.values())
	const winningTeamIds = new Set<number>()
	for (const [teamId, teamScore] of teamScores.entries()) {
		if (teamScore.equalTo(maxTeamScore)) {
			winningTeamIds.add(teamId)
		}
	}

	return splitPlayersByWinningTeams(players, winningTeamIds)
}

const resolveWinningPlayers = (
	lobby: Lobby,
	players: Client[],
	scoreRule: PvpScoreRule,
) => {
	if (scoreRule === 'custom') {
		const winnerCount = getLobbyCustomWinnerCount(lobby.options, players.length)
		const winningScore = getCustomWinningScore(
			players,
			(player) => player.score,
			winnerCount,
		)
		return {
			winners: players.filter(
				(player) => winningScore && scoreIsAtLeast(player.score, winningScore),
			),
			losers: players.filter(
				(player) => !winningScore || player.score.lessThan(winningScore),
			),
		}
	}

	if (scoreRule !== 'highest') {
		const scores = players.map((player) => player.score)

		let winners = players.filter((player) =>
			scoreBeatsRuleTarget(player.score, scores, scoreRule),
		)
		let losers = players.filter(
			(player) => !scoreBeatsRuleTarget(player.score, scores, scoreRule),
		)

		if (winners.length === 0) {
			const maxScore = highestScore(players.map((player) => player.score))
			winners = players.filter((player) => player.score.equalTo(maxScore))
			losers = players.filter((player) => player.score.lessThan(maxScore))
		}

		return { winners, losers }
	}

	const maxScore = highestScore(players.map((player) => player.score))
	return {
		winners: players.filter((player) => player.score.equalTo(maxScore)),
		losers: players.filter((player) => player.score.lessThan(maxScore)),
	}
}

const resolveDuelPair = (left: Client, right: Client) => {
	if (left.score.equalTo(right.score)) {
		return { winners: [left, right], losers: [] }
	}

	return left.score.greaterThan(right.score)
		? { winners: [left], losers: [right] }
		: { winners: [right], losers: [left] }
}

const resolveDuelBye = (lobby: Lobby, player: Client) => {
	const recordedResult = getDuelByeResult(lobby, player)
	if (recordedResult !== undefined) {
		return recordedResult
			? { winners: [player], losers: [] }
			: { winners: [], losers: [player] }
	}

	const blindTarget = lobby.duelState.getBlindTarget(player.id)
	if (!blindTarget || didDuelByeBeatBlindTarget(lobby, player)) {
		return { winners: [player], losers: [] }
	}

	return { winners: [], losers: [player] }
}

const resolveDuelWinners = (lobby: Lobby, players: Client[]) => {
	const playersById = new Map(players.map((player) => [player.id, player]))
	const seenPlayerIds = new Set<string>()
	const winners: Client[] = []
	const losers: Client[] = []

	for (const player of players) {
		if (seenPlayerIds.has(player.id)) {
			continue
		}
		seenPlayerIds.add(player.id)

		if (isDuelByePlayer(lobby, player)) {
			const result = resolveDuelBye(lobby, player)
			winners.push(...result.winners)
			losers.push(...result.losers)
			continue
		}

		const opponentId = lobby.duelState.getOpponentId(player.id)
		const opponent = opponentId ? playersById.get(opponentId) : undefined
		if (!opponent) {
			winners.push(player)
			continue
		}

		seenPlayerIds.add(opponent.id)
		const result = resolveDuelPair(player, opponent)
		winners.push(...result.winners)
		losers.push(...result.losers)
	}

	return { winners, losers }
}

export const resolveBlindWinnersAndLosers = (
	lobby: Lobby,
	players: Client[],
) => {
	const scoreRule = getLobbyOptionsScoreRule(lobby.options)
	if (isDuelsLobbyType(lobby.lobbyType)) {
		return resolveDuelWinners(lobby, players)
	}

	return lobby.lobbyType === 'teams'
		? resolveWinningTeams(lobby, players, scoreRule)
		: resolveWinningPlayers(lobby, players, scoreRule)
}
