import type Client from './Client.js'
import type { InsaneInt } from './InsaneInt.js'

const stableDuelHash = (value: string): number => {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

const rankByStableHash = (
	lobbyCode: string,
	roundIndex: number,
	scope: string,
	players: Client[],
) =>
	[...players].sort((left, right) => {
		const leftScore = stableDuelHash(
			`${lobbyCode}:${roundIndex}:${scope}:${left.id}`,
		)
		const rightScore = stableDuelHash(
			`${lobbyCode}:${roundIndex}:${scope}:${right.id}`,
		)
		if (leftScore !== rightScore) {
			return leftScore - rightScore
		}
		return left.id.localeCompare(right.id)
	})

export class LobbyDuelState {
	private pairings = new Map<string, string | null>()
	private blindTargets = new Map<string, InsaneInt>()
	private byeResults = new Map<string, boolean>()
	private byeCounts = new Map<string, number>()
	private lastByePlayerId: string | null = null
	private roundIndex = 0

	clearRound = () => {
		this.pairings.clear()
		this.blindTargets.clear()
		this.byeResults.clear()
	}

	clearMatchState = () => {
		this.clearRound()
		this.byeCounts.clear()
		this.lastByePlayerId = null
		this.roundIndex = 0
	}

	hasRound = () => this.pairings.size > 0

	getOpponentId = (playerId: string) => this.pairings.get(playerId) ?? null

	isBye = (playerId: string) =>
		this.pairings.has(playerId) && this.pairings.get(playerId) === null

	setBlindTarget = (playerId: string, blindTarget: InsaneInt) => {
		this.blindTargets.set(playerId, blindTarget)
	}

	getBlindTarget = (playerId: string) => this.blindTargets.get(playerId)

	setByeResult = (playerId: string, won: boolean) => {
		if (this.isBye(playerId)) {
			this.byeResults.set(playerId, won)
		}
	}

	getByeResult = (playerId: string) => this.byeResults.get(playerId)

	hasByeResult = (playerId: string) => this.byeResults.has(playerId)

	beginRound = (lobbyCode: string, activePlayers: Client[]) => {
		this.clearRound()
		this.roundIndex += 1

		let playersToPair = [...activePlayers]
		for (const player of activePlayers) {
			if (!this.byeCounts.has(player.id)) {
				this.byeCounts.set(player.id, 0)
			}
		}

		if (playersToPair.length % 2 === 1) {
			const byePlayer = this.chooseByePlayer(lobbyCode, playersToPair)
			if (byePlayer) {
				this.pairings.set(byePlayer.id, null)
				this.byeCounts.set(
					byePlayer.id,
					(this.byeCounts.get(byePlayer.id) ?? 0) + 1,
				)
				this.lastByePlayerId = byePlayer.id
				playersToPair = playersToPair.filter(
					(player) => player.id !== byePlayer.id,
				)
			}
		}

		const rankedPlayers = rankByStableHash(
			lobbyCode,
			this.roundIndex,
			'pair',
			playersToPair,
		)
		for (let index = 0; index < rankedPlayers.length; index += 2) {
			const left = rankedPlayers[index]
			const right = rankedPlayers[index + 1]
			if (!left || !right) {
				continue
			}
			this.pairings.set(left.id, right.id)
			this.pairings.set(right.id, left.id)
		}
	}

	private chooseByePlayer = (lobbyCode: string, players: Client[]) => {
		if (players.length === 0) {
			return null
		}

		const lowestByeCount = Math.min(
			...players.map((player) => this.byeCounts.get(player.id) ?? 0),
		)
		let candidates = players.filter(
			(player) => (this.byeCounts.get(player.id) ?? 0) === lowestByeCount,
		)

		const nonRepeatCandidates = candidates.filter(
			(player) => player.id !== this.lastByePlayerId,
		)
		if (nonRepeatCandidates.length > 0) {
			candidates = nonRepeatCandidates
		}

		return rankByStableHash(
			lobbyCode,
			this.roundIndex,
			'bye',
			candidates,
		)[0] ?? null
	}
}
