import { InsaneInt } from './InsaneInt.js'
import type Lobby from './Lobby.js'
import type Client from './Client.js'
import { isDuelByePlayer, isDuelByeResolved } from './lobbyDuelCoordinator.js'
import { isDuelsLobbyType } from './lobbyTypes.js'
import { getLobbyOptionsScoreRule, type PvpScoreRule } from './lobbyOptions.js'

const ZERO_SCORE = new InsaneInt(0, 0, 0)

const cloneScore = (score: InsaneInt) =>
	new InsaneInt(score.startingECount, score.coefficient, score.exponent)

export const sumScoreValues = (scores: Iterable<InsaneInt>) => {
	let total = new InsaneInt(0, 0, 0)
	for (const score of scores) {
		total = total.add(score)
	}
	return total
}

export const highestScore = (scores: Iterable<InsaneInt>) => {
	let highest = new InsaneInt(0, 0, 0)
	for (const score of scores) {
		if (score.greaterThan(highest)) highest = score
	}
	return highest
}

const sortScoresAscending = (scores: Iterable<InsaneInt>) =>
	Array.from(scores, cloneScore).sort((left, right) =>
		left.equalTo(right) ? 0 : left.lessThan(right) ? -1 : 1,
	)

export const medianScore = (scores: Iterable<InsaneInt>) => {
	const sortedScores = sortScoresAscending(scores)
	const count = sortedScores.length
	if (count === 0) {
		return cloneScore(ZERO_SCORE)
	}

	const upperMiddleIndex = Math.floor(count / 2)
	if (count % 2 === 1) {
		return sortedScores[upperMiddleIndex]
	}

	return sortedScores[upperMiddleIndex - 1]
		.add(sortedScores[upperMiddleIndex])
		.div(new InsaneInt(0, 2, 0))
}

export const sumScores = (players: Client[]) =>
	sumScoreValues(players.map((player) => player.score))

export const buildTeamScoreSnapshot = (players: Client[]) => {
	const teamScores = new Map<number, InsaneInt>()
	const teamsWithHands = new Set<number>()

	for (const player of players) {
		const teamId = player.team ?? 1
		teamScores.set(
			teamId,
			(teamScores.get(teamId) ?? new InsaneInt(0, 0, 0)).add(player.score),
		)
		if (player.handsLeft > 0) {
			teamsWithHands.add(teamId)
		}
	}

	return { teamScores, teamsWithHands }
}

const divideScoreByCount = (totalScore: InsaneInt, count: number) => {
	return totalScore.div(new InsaneInt(0, Math.max(1, count), 0))
}

export const averageScore = (scores: Iterable<InsaneInt>, count: number) =>
	divideScoreByCount(sumScoreValues(scores), count)

const getLog10Score = (score: InsaneInt) => {
	const normalizedScore = cloneScore(score)
	normalizedScore.balance()

	if (!normalizedScore.greaterThan(ZERO_SCORE)) {
		return null
	}

	if (normalizedScore.startingECount > 0) {
		return new InsaneInt(
			normalizedScore.startingECount - 1,
			normalizedScore.coefficient,
			normalizedScore.exponent,
		)
	}

	return new InsaneInt(
		0,
		Math.log10(normalizedScore.coefficient) + normalizedScore.exponent,
		0,
	)
}

const getAverageLog10Score = (scores: InsaneInt[]) => {
	const logScores: InsaneInt[] = []
	for (const score of scores) {
		const logScore = getLog10Score(score)
		if (!logScore) {
			return null
		}
		logScores.push(logScore)
	}

	return averageScore(logScores, logScores.length)
}

const scoreGreaterThanGeometricMean = (
	score: InsaneInt,
	scores: InsaneInt[],
) => {
	if (scores.length === 0) {
		return false
	}

	if (scores.some((candidate) => !candidate.greaterThan(ZERO_SCORE))) {
		return score.greaterThan(ZERO_SCORE)
	}

	const logScore = getLog10Score(score)
	const averageLogScore = getAverageLog10Score(scores)
	return !!logScore && !!averageLogScore && logScore.greaterThan(averageLogScore)
}

export const scoreBeatsRuleTarget = (
	score: InsaneInt,
	scores: InsaneInt[],
	scoreRule: PvpScoreRule,
) => {
	if (scoreRule === 'average') {
		return score.greaterThan(averageScore(scores, scores.length))
	}

	if (scoreRule === 'median') {
		return score.greaterThan(medianScore(scores))
	}

	if (scoreRule === 'geometric') {
		return scoreGreaterThanGeometricMean(score, scores)
	}

	return false
}

const canResolveThresholdRuleEarlyForPlayers = (
	players: Client[],
	scoreRule: PvpScoreRule,
) => {
	const playersWithHands = players.filter((player) => player.handsLeft > 0)
	if (playersWithHands.length !== 1) {
		return false
	}

	const activePlayer = playersWithHands[0]
	const settledPlayers = players.filter(
		(player) => player.id !== activePlayer.id,
	)
	if (settledPlayers.length === 0) {
		return false
	}

	const scores = players.map((player) => player.score)
	const activePlayerCanWin = scoreBeatsRuleTarget(
		activePlayer.score,
		scores,
		scoreRule,
	)
	const everyoneElseCannotWin = settledPlayers.every(
		(player) => !scoreBeatsRuleTarget(player.score, scores, scoreRule),
	)

	return activePlayerCanWin && everyoneElseCannotWin
}

const canResolveThresholdRuleEarlyForTeams = (
	players: Client[],
	scoreRule: PvpScoreRule,
) => {
	const { teamScores, teamsWithHands } = buildTeamScoreSnapshot(players)

	if (teamsWithHands.size !== 1 || teamScores.size <= 1) {
		return false
	}

	const [activeTeamId] = teamsWithHands
	if (activeTeamId === undefined) {
		return false
	}

	const activeTeamScore = teamScores.get(activeTeamId)
	if (!activeTeamScore) {
		return false
	}

	const scores = Array.from(teamScores.values())
	const activeTeamCanWin = scoreBeatsRuleTarget(
		activeTeamScore,
		scores,
		scoreRule,
	)
	const everyOtherTeamCannotWin = Array.from(teamScores.entries())
		.filter(([teamId]) => teamId !== activeTeamId)
		.every(([, score]) => !scoreBeatsRuleTarget(score, scores, scoreRule))

	return activeTeamCanWin && everyOtherTeamCannotWin
}

const getTotalActiveHands = (players: Client[]) => {
	let totalHands = 0
	for (const player of players) {
		totalHands += Math.max(0, player.handsLeft)
	}
	return totalHands
}

const scoreIsAtLeast = (score: InsaneInt, target: InsaneInt) =>
	score.equalTo(target) || score.greaterThan(target)

const isDuelPairResolved = (left: Client, right: Client) => {
	const leftOutOfHands = left.handsLeft <= 0
	const rightOutOfHands = right.handsLeft <= 0

	if (leftOutOfHands && rightOutOfHands) {
		return true
	}

	if (leftOutOfHands) {
		return scoreIsAtLeast(right.score, left.score)
	}

	if (rightOutOfHands) {
		return scoreIsAtLeast(left.score, right.score)
	}

	return false
}

const shouldResolveDuelRoundNow = (lobby: Lobby, players: Client[]) => {
	const playersById = new Map(players.map((player) => [player.id, player]))
	const seenPlayerIds = new Set<string>()

	for (const player of players) {
		if (seenPlayerIds.has(player.id)) {
			continue
		}
		seenPlayerIds.add(player.id)

		if (isDuelByePlayer(lobby, player)) {
			if (!isDuelByeResolved(lobby, player)) {
				return false
			}
			continue
		}

		const opponentId = lobby.duelState.getOpponentId(player.id)
		const opponent = opponentId ? playersById.get(opponentId) : undefined
		if (!opponent) {
			continue
		}

		seenPlayerIds.add(opponent.id)
		if (!isDuelPairResolved(player, opponent)) {
			return false
		}
	}

	return true
}

export const shouldResolveBlindNow = (lobby: Lobby, players: Client[]) => {
	const scoreRule = getLobbyOptionsScoreRule(lobby.options)
	const totalActiveHands = getTotalActiveHands(players)

	if (isDuelsLobbyType(lobby.lobbyType)) {
		return shouldResolveDuelRoundNow(lobby, players)
	}

	if (totalActiveHands <= 0) {
		return true
	}

	if (scoreRule !== 'highest') {
		return lobby.lobbyType === 'teams'
			? canResolveThresholdRuleEarlyForTeams(players, scoreRule)
			: canResolveThresholdRuleEarlyForPlayers(players, scoreRule)
	}

	if (lobby.lobbyType === 'teams') {
		const { teamScores, teamsWithHands } = buildTeamScoreSnapshot(players)

		if (teamsWithHands.size === 1) {
			const [activeTeamId] = teamsWithHands
			let maxScore = new InsaneInt(0, 0, 0)
			let leadTeamId = -1

			for (const [teamId, teamScore] of teamScores.entries()) {
				if (teamScore.greaterThan(maxScore)) {
					maxScore = teamScore
					leadTeamId = teamId
				}
			}

			return leadTeamId === activeTeamId
		}

		return false
	}

	const playersWithHands = players.filter((player) => player.handsLeft > 0)
	if (playersWithHands.length !== 1) {
		return false
	}

	const activePlayer = playersWithHands[0]
	const maxScore = highestScore(players.map((player) => player.score))

	return activePlayer.score.equalTo(maxScore)
}
