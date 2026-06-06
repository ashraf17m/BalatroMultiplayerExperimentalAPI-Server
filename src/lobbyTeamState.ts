import type { InsaneInt } from './InsaneInt.js'

export class LobbyTeamState {
	decks = new Map<number, Map<string, string | null>>()
	handLevels = new Map<number, Map<string, string>>()
	lives = new Map<number, number>()
	blindTargets = new Map<number, InsaneInt>()
	lifeBlockers = new Set<number>()
	resolvedCoopTeams = new Set<number>()

	clearSyncCaches = () => {
		this.decks.clear()
		this.handLevels.clear()
	}

	clearMatchState = () => {
		this.lives.clear()
		this.blindTargets.clear()
		this.lifeBlockers.clear()
		this.resolvedCoopTeams.clear()
	}

	clearAll = () => {
		this.clearSyncCaches()
		this.clearMatchState()
	}

	getDeck = (teamId: number) => this.decks.get(teamId)

	ensureDeck = (teamId: number) => {
		let teamDeck = this.decks.get(teamId)
		if (!teamDeck) {
			teamDeck = new Map<string, string | null>()
			this.decks.set(teamId, teamDeck)
		}
		return teamDeck
	}

	getHandLevels = (teamId: number) => this.handLevels.get(teamId)

	ensureHandLevels = (teamId: number) => {
		let teamHandLevels = this.handLevels.get(teamId)
		if (!teamHandLevels) {
			teamHandLevels = new Map<string, string>()
			this.handLevels.set(teamId, teamHandLevels)
		}
		return teamHandLevels
	}

	getLives = (teamId: number) => this.lives.get(teamId) ?? 0

	setLives = (teamId: number, lives: number) => {
		this.lives.set(teamId, lives)
		return lives
	}

	getBlindTarget = (teamId: number) => this.blindTargets.get(teamId)

	setBlindTarget = (teamId: number, blindTarget: InsaneInt) => {
		this.blindTargets.set(teamId, blindTarget)
		return blindTarget
	}

	deleteBlindTarget = (teamId: number) => this.blindTargets.delete(teamId)

	clearBlindTargets = () => {
		this.blindTargets.clear()
	}

	hasLifeBlocker = (teamId: number) => this.lifeBlockers.has(teamId)

	addLifeBlocker = (teamId: number) => {
		this.lifeBlockers.add(teamId)
	}

	deleteLifeBlocker = (teamId: number) => this.lifeBlockers.delete(teamId)

	clearLifeBlockers = () => {
		this.lifeBlockers.clear()
	}

	hasResolvedCoopTeam = (teamId: number) => this.resolvedCoopTeams.has(teamId)

	addResolvedCoopTeam = (teamId: number) => {
		this.resolvedCoopTeams.add(teamId)
	}

	deleteResolvedCoopTeam = (teamId: number) =>
		this.resolvedCoopTeams.delete(teamId)

	clearResolvedCoopTeams = () => {
		this.resolvedCoopTeams.clear()
	}
}
