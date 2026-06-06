import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionSetAnte,
	ActionSetFurthestBlind,
	ActionSetLocation,
	ActionSkip,
} from './actions.js'
import { setClientLocation } from './clientState.js'
import {
	buildLobbyAnteTimerAction,
	normalizeLobbyAnteValue,
	resetLobbyAnteTimer,
} from './lobbyAnteTimer.js'
import { broadcastLobbyMatchAction } from './lobbyBroadcasts.js'
import { broadcastLobbyPlayerState } from './lobbyPlayerState/broadcasts.js'
import { resetLobbyTeamLifeBlocker } from './lobbyPlayerState/lives.js'
import { isPlayerExcludedFromActiveMatch } from './lobbyPlayerState/queries.js'
import {
	isFurthestBlindProgressAhead,
	resolveSurvivalGameOver,
} from './matchGameOver.js'

const normalizeNonNegativeInteger = (number: number) => {
	const value = Number(number)
	if (!Number.isFinite(value)) {
		return null
	}

	return Math.max(0, Math.floor(value))
}

const normalizeInteger = (number: number) => {
	const value = Number(number)
	if (!Number.isFinite(value)) {
		return null
	}

	return Math.trunc(value)
}

export const setAnteAction = (
	{ ante }: ActionHandlerArgs<ActionSetAnte>,
	client: Client,
) => {
	const lobby = client.lobby
	if (lobby && isPlayerExcludedFromActiveMatch(lobby, client)) {
		return
	}

	const normalizedAnte = normalizeLobbyAnteValue(ante)
	if (normalizedAnte === null) return

	const previousAnte = client.ante
	client.ante = normalizedAnte

	if (
		lobby &&
		lobby.anteTimer.controllerId === client.id &&
		previousAnte !== normalizedAnte
	) {
		resetLobbyAnteTimer(lobby)
		if (lobby.options?.timer) {
			broadcastLobbyMatchAction(lobby, buildLobbyAnteTimerAction(lobby))
		}
	}
}

export const setLocationAction = (
	{ location }: ActionHandlerArgs<ActionSetLocation>,
	client: Client,
) => {
	const lobby = client.lobby
	if (lobby && isPlayerExcludedFromActiveMatch(lobby, client)) {
		return
	}

	setClientLocation(client, location)
}

export const newRoundAction = (client: Client) => {
	const lobby = client.lobby
	if (lobby && isPlayerExcludedFromActiveMatch(lobby, client)) {
		return
	}
	client.livesBlocker = false
	if (lobby?.lobbyType === 'teams') {
		resetLobbyTeamLifeBlocker(lobby, client.team ?? 1)
	}
}

export const setFurthestBlindAction = (
	{ furthestBlind }: ActionHandlerArgs<ActionSetFurthestBlind>,
	client: Client,
) => {
	const lobby = client.lobby
	const normalizedFurthestBlind = normalizeInteger(furthestBlind)
	if (normalizedFurthestBlind === null) return

	if (isFurthestBlindProgressAhead(normalizedFurthestBlind, client.furthestBlind)) {
		client.furthestBlind = normalizedFurthestBlind
	}
	if (!lobby) return
	if (!client.isInMatch) return

	if (lobby.gameMode === 'survival') {
		resolveSurvivalGameOver(lobby)
	}
}

export const skipAction = (
	{ skips }: ActionHandlerArgs<ActionSkip>,
	client: Client,
) => {
	const lobby = client.lobby
	if (!lobby) return
	if (isPlayerExcludedFromActiveMatch(lobby, client)) return

	const normalizedSkips = normalizeNonNegativeInteger(skips)
	if (normalizedSkips === null) return

	const skipDelta = normalizedSkips - client.skips
	client.skips = normalizedSkips
	if (skipDelta > 0 && lobby.options?.timer) {
		lobby.anteTimer.addSkipCount(client.id, skipDelta)
	}
	broadcastLobbyPlayerState(lobby, client)
}
