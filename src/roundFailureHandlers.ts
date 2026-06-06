import type Client from './Client.js'
import type { LifeLossReason } from './actionServerMatch.js'
import { loseClientLife } from './clientState.js'
import type Lobby from './Lobby.js'
import {
	buildLobbyAnteTimerAction,
} from './lobbyAnteTimer.js'
import { isPlayerReadyForPvpBlind } from './blindRules.js'
import {
	didDuelByeBeatBlindTarget,
	hasDuelByeResult,
	isDuelByePlayer,
	markDuelByeResult,
} from './lobbyDuelCoordinator.js'
import { broadcastLobbyMatchAction } from './lobbyBroadcasts.js'
import { loseLobbyTeamLife } from './lobbyPlayerState/lives.js'
import { getLobbyActivePlayers } from './lobbyPlayerState/queries.js'
import {
	resolveSoloEliminations,
	resolveSurvivalGameOver,
	resolveTeamsGameOver,
} from './matchGameOver.js'
import { traceRuntimeEvent } from './runtimeTrace.js'
import { reconcileActiveMatchState } from './matchResolution.js'

type ActiveRoundFailureLobby = NonNullable<Client['lobby']>

const getActiveRoundFailureLobby = (
	client: Client,
): ActiveRoundFailureLobby | null => {
	const lobby = client.lobby
	if (!lobby || !client.isInMatch) {
		return null
	}

	return lobby
}

const loseTeamLifeAndResolveGameOver = (
	lobby: Lobby,
	teamId: number,
	reason: LifeLossReason,
) => {
	const remainingLives = loseLobbyTeamLife(lobby, teamId, reason)
	if (remainingLives <= 0) {
		resolveTeamsGameOver(lobby, teamId)
	}
	return remainingLives
}

const resolveTeamRoundFailure = (
	lobby: ActiveRoundFailureLobby,
	client: Client,
) => {
	loseTeamLifeAndResolveGameOver(
		lobby,
		client.team ?? 1,
		'round_failed_death_on_round_loss',
	)
}

const resolveTeamSpeedlatroTimeout = (
	lobby: ActiveRoundFailureLobby,
	client: Client,
) => {
	const teamId = client.team ?? 1
	const remainingLives = loseTeamLifeAndResolveGameOver(
		lobby,
		teamId,
		'speedlatro_client_timeout',
	)
	traceRuntimeEvent('speedlatro.timeout_accepted', {
		lobbyCode: lobby.code,
		lobbyType: lobby.lobbyType,
		playerId: client.id,
		remainingLives,
		teamId,
	})
}

const resolveTeamTimerFailure = (
	lobby: Lobby,
	teamId: number,
	forgivenessLimit: number,
) => {
	if (lobby.anteTimer.consumeTeamForgiveness(teamId, forgivenessLimit)) {
		return
	}

	loseTeamLifeAndResolveGameOver(
		lobby,
		teamId,
		'ante_timer_expired',
	)
}

const resolveSoloTimerFailure = (
	lobby: Lobby,
	player: ReturnType<typeof getLobbyActivePlayers>[number],
	forgivenessLimit: number,
) => {
	if (lobby.anteTimer.consumePlayerForgiveness(player.id, forgivenessLimit)) {
		return
	}

	loseClientLife(player, 'ante_timer_expired')
}

const normalizeTimerForgivenessLimit = (value: unknown) =>
	Math.max(0, Math.trunc(Number(value) || 0))

const resolveClientReportedSpeedlatroTimeout = (
	lobby: ActiveRoundFailureLobby,
	client: Client,
) => {
	if (lobby.options.ruleset !== 'ruleset_mp_speedlatro') {
		traceRuntimeEvent('speedlatro.timeout_ignored', {
			lobbyCode: lobby.code,
			playerId: client.id,
			reason: 'ruleset_not_speedlatro',
		})
		return
	}
	if (isPlayerReadyForPvpBlind(client)) {
		traceRuntimeEvent('speedlatro.timeout_ignored', {
			lobbyCode: lobby.code,
			playerId: client.id,
			reason: 'ready_for_pvp',
		})
		return
	}

	if (lobby.gameMode !== 'survival' && lobby.lobbyType === 'teams') {
		resolveTeamSpeedlatroTimeout(lobby, client)
		return
	}

	loseClientLife(client, 'speedlatro_client_timeout')
	traceRuntimeEvent('speedlatro.timeout_accepted', {
		lobbyCode: lobby.code,
		lobbyType: lobby.lobbyType,
		playerId: client.id,
		remainingLives: client.lives,
	})
	if (lobby.gameMode === 'survival') {
		resolveSurvivalGameOver(lobby)
	} else {
		resolveSoloEliminations(lobby)
	}
}

export const expireLobbyAnteTimer = (
	lobby: Lobby,
	expectedGeneration?: number,
) => {
	if (expectedGeneration !== undefined && lobby.anteTimer.generation !== expectedGeneration) {
		traceRuntimeEvent('ante_timer.expire_ignored', {
			expectedGeneration,
			generation: lobby.anteTimer.generation,
			lobbyCode: lobby.code,
			reason: 'stale_generation',
		})
		return false
	}
	if (!lobby.isInGame || lobby.options.timer !== true) {
		traceRuntimeEvent('ante_timer.expire_ignored', {
			lobbyCode: lobby.code,
			reason: !lobby.isInGame ? 'lobby_not_in_game' : 'timer_disabled',
		})
		return false
	}

	const timerState = lobby.anteTimer.getEffectiveState()
	if (!timerState.timerStarted || timerState.time > 0) {
		traceRuntimeEvent('ante_timer.expire_ignored', {
			lobbyCode: lobby.code,
			reason: timerState.timerStarted ? 'time_remaining' : 'not_started',
			time: timerState.time,
		})
		return false
	}

	lobby.anteTimer.setPaused(0)
	broadcastLobbyMatchAction(lobby, buildLobbyAnteTimerAction(lobby))

	const expiredPlayers = getLobbyActivePlayers(lobby).filter(
		(player) => !isPlayerReadyForPvpBlind(player),
	)
	if (expiredPlayers.length === 0) {
		traceRuntimeEvent('ante_timer.expired', {
			expiredPlayers: 0,
			lobbyCode: lobby.code,
			lobbyType: lobby.lobbyType,
		})
		return true
	}

	const forgivenessLimit = normalizeTimerForgivenessLimit(
		lobby.options.timer_forgiveness,
	)
	if (lobby.gameMode !== 'survival' && lobby.lobbyType === 'teams') {
		const expiredTeamIds = new Set(
			expiredPlayers.map((player) => player.team ?? 1),
		)
		for (const teamId of expiredTeamIds) {
			resolveTeamTimerFailure(lobby, teamId, forgivenessLimit)
		}
		traceRuntimeEvent('ante_timer.expired', {
			expiredPlayers: expiredPlayers.length,
			expiredTeams: expiredTeamIds.size,
			lobbyCode: lobby.code,
			lobbyType: lobby.lobbyType,
		})
		return true
	}

	for (const player of expiredPlayers) {
		resolveSoloTimerFailure(lobby, player, forgivenessLimit)
	}
	if (lobby.gameMode === 'survival') {
		resolveSurvivalGameOver(lobby)
	} else {
		resolveSoloEliminations(lobby)
	}
	traceRuntimeEvent('ante_timer.expired', {
		expiredPlayers: expiredPlayers.length,
		lobbyCode: lobby.code,
		lobbyType: lobby.lobbyType,
	})
	return true
}

export const failRoundAction = (client: Client) => {
	const lobby = getActiveRoundFailureLobby(client)
	if (!lobby) return

	if (isDuelByePlayer(lobby, client)) {
		if (didDuelByeBeatBlindTarget(lobby, client)) {
			markDuelByeResult(lobby, client, true)
		} else if (!hasDuelByeResult(lobby, client)) {
			markDuelByeResult(lobby, client, false)
		}
		reconcileActiveMatchState(lobby)
		return
	}

	if (lobby.gameMode === 'survival') {
		if (lobby.options.death_on_round_loss) {
			loseClientLife(client, 'round_failed_death_on_round_loss')
		}
		resolveSurvivalGameOver(lobby)
		return
	}

	if (lobby.lobbyType === 'teams') {
		if (lobby.options.death_on_round_loss) {
			resolveTeamRoundFailure(lobby, client)
		}
		return
	}

	if (lobby.options.death_on_round_loss) {
		loseClientLife(client, 'round_failed_death_on_round_loss')
	}
	resolveSoloEliminations(lobby)
}

export const failTimerAction = (client: Client) => {
	const lobby = getActiveRoundFailureLobby(client)
	if (!lobby) return
	if (expireLobbyAnteTimer(lobby)) {
		return
	}
	resolveClientReportedSpeedlatroTimeout(lobby, client)
}
