import type Lobby from './Lobby.js'
import type { ActionPauseAnteTimer, ActionStartAnteTimer } from './actions.js'
import type Client from './Client.js'

export const normalizeLobbyAnteTimerValue = (time: unknown) =>
	Math.max(0, Math.trunc(Number(time) || 0))

export const normalizeLobbyAnteValue = (ante: unknown) => {
	const value = Number(ante)
	if (!Number.isFinite(value)) {
		return null
	}

	return Math.trunc(value)
}

export class LobbyAnteTimerState {
	time = 0
	started = false
	lockedForAnte = false
	updatedAt: number | null = null
	controllerId: string | null = null
	controllerAnte: number | null = null
	generation = 0
	private expiryTimer: ReturnType<typeof setTimeout> | null = null
	private readonly skipCountsByPlayerId = new Map<string, number>()
	private readonly forgivenTimeoutsByPlayerId = new Map<string, number>()
	private readonly forgivenTimeoutsByTeamId = new Map<number, number>()

	private advanceGeneration = () => {
		this.generation += 1
		return this.generation
	}

	clearExpiryTimer = () => {
		if (this.expiryTimer) {
			clearTimeout(this.expiryTimer)
			this.expiryTimer = null
		}
	}

	scheduleExpiryTimer = (onExpire: (generation: number) => void) => {
		this.clearExpiryTimer()
		const timerState = this.getEffectiveState()
		if (!timerState.timerStarted) {
			return
		}

		const generation = this.generation
		this.expiryTimer = setTimeout(() => {
			this.expiryTimer = null
			onExpire(generation)
		}, timerState.time * 1000)
		this.expiryTimer.unref?.()
	}

	getEffectiveState = () => {
		const baseTime = normalizeLobbyAnteTimerValue(this.time)

		if (!this.started) {
			return {
				time: baseTime,
				timerStarted: false,
			}
		}

		const updatedAt = this.updatedAt
		if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
			return {
				time: baseTime,
				timerStarted: true,
			}
		}

		const elapsedSeconds = Math.max(
			0,
			Math.floor((Date.now() - updatedAt) / 1000),
		)
		return {
			time: Math.max(0, baseTime - elapsedSeconds),
			timerStarted: true,
		}
	}

	getSyncState = () => {
		const serverNow = Date.now()
		const timerState = this.getEffectiveState()
		const baseTime = normalizeLobbyAnteTimerValue(this.time)
		const deadlineAt = this.started
			? typeof this.updatedAt === 'number' && Number.isFinite(this.updatedAt)
				? this.updatedAt + baseTime * 1000
				: serverNow + timerState.time * 1000
			: undefined

		return {
			...timerState,
			serverNow,
			deadlineAt,
			timerGeneration: this.generation,
		}
	}

	reset = (time = 0) => {
		this.clearExpiryTimer()
		this.advanceGeneration()
		this.time = normalizeLobbyAnteTimerValue(time)
		this.started = false
		this.lockedForAnte = false
		this.updatedAt = null
		this.controllerId = null
		this.controllerAnte = null
		this.skipCountsByPlayerId.clear()
	}

	setRunning = (time?: number) => {
		this.clearExpiryTimer()
		this.advanceGeneration()
		const nextTime = time == null ? this.getEffectiveState().time : time
		const normalizedTime = normalizeLobbyAnteTimerValue(nextTime)
		this.time = normalizedTime
		this.started = true
		this.lockedForAnte = true
		this.updatedAt = Date.now()
		return normalizedTime
	}

	setPaused = (time?: number) => {
		this.clearExpiryTimer()
		this.advanceGeneration()
		const nextTime = time == null ? this.getEffectiveState().time : time
		const normalizedTime = normalizeLobbyAnteTimerValue(nextTime)
		this.time = normalizedTime
		this.started = false
		this.updatedAt = null
		this.lockedForAnte = true
		return normalizedTime
	}

	shouldIncludeTime = () => this.lockedForAnte || this.started

	addSkipCount = (playerId: string, amount: unknown) => {
		if (this.lockedForAnte) {
			return this.getSkipCount(playerId)
		}

		const normalizedAmount = normalizeLobbyAnteTimerValue(amount)
		if (normalizedAmount <= 0) {
			return this.getSkipCount(playerId)
		}

		const nextSkipCount = this.getSkipCount(playerId) + normalizedAmount
		this.skipCountsByPlayerId.set(playerId, nextSkipCount)
		return nextSkipCount
	}

	getSkipCount = (playerId: string) =>
		this.skipCountsByPlayerId.get(playerId) ?? 0

	clearForgiveness = () => {
		this.forgivenTimeoutsByPlayerId.clear()
		this.forgivenTimeoutsByTeamId.clear()
	}

	private consumeForgiveness = <TKey>(
		forgivenTimeouts: Map<TKey, number>,
		key: TKey,
		limit: unknown,
	) => {
		const forgivenessLimit = normalizeLobbyAnteTimerValue(limit)
		if (forgivenessLimit <= 0) {
			return false
		}

		const used = forgivenTimeouts.get(key) ?? 0
		if (used >= forgivenessLimit) {
			return false
		}

		forgivenTimeouts.set(key, used + 1)
		return true
	}

	consumePlayerForgiveness = (playerId: string, limit: unknown) =>
		this.consumeForgiveness(this.forgivenTimeoutsByPlayerId, playerId, limit)

	consumeTeamForgiveness = (teamId: number, limit: unknown) =>
		this.consumeForgiveness(this.forgivenTimeoutsByTeamId, teamId, limit)
}

const getLobbyAnteTimerSyncState = (lobby: Lobby) => {
	return lobby.anteTimer.getSyncState()
}

export const resetLobbyAnteTimer = (
	lobby: Lobby,
	time = Number(lobby.options.timer_base_seconds) || 0,
) => {
	lobby.anteTimer.reset(time)
}

export const releaseLobbyAnteTimerController = (
	lobby: Lobby,
	controllerId: string,
) => {
	if (lobby.anteTimer.controllerId !== controllerId) {
		return false
	}

	const wasStarted = lobby.anteTimer.started
	if (wasStarted) {
		lobby.anteTimer.setPaused()
	}
	lobby.anteTimer.controllerId = null
	lobby.anteTimer.controllerAnte = null
	return wasStarted
}

export const getLobbyAnteTimerStartTime = (
	lobby: Lobby,
	controller: Client,
) => {
	const baseTime = normalizeLobbyAnteTimerValue(lobby.options.timer_base_seconds)
	const startTime =
		lobby.options.ruleset === 'ruleset_mp_speedlatro'
			? Math.max(0, baseTime - 3)
			: baseTime
	const increment = normalizeLobbyAnteTimerValue(
		lobby.options.timer_increment_seconds,
	)
	return startTime + increment * lobby.anteTimer.getSkipCount(controller.id)
}

export const buildLobbyAnteTimerAction = (
	lobby: Lobby,
	options?: { includeTime?: boolean },
): ActionStartAnteTimer | ActionPauseAnteTimer => {
	const timerState = getLobbyAnteTimerSyncState(lobby)
	const action = timerState.timerStarted ? 'startAnteTimer' : 'pauseAnteTimer'
	if (options?.includeTime === false) {
		return { action }
	}

	return {
		action,
		time: timerState.time,
		serverNow: timerState.serverNow,
		deadlineAt: timerState.deadlineAt,
		timerGeneration: timerState.timerGeneration,
	}
}
