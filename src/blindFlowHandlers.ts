import type Client from './Client.js'
import { parseFiniteInsaneInt } from './InsaneInt.js'
import type { ActionHandlerArgs, ActionPlayHand } from './actions.js'
import {
	didDuelByeBeatBlindTarget,
	hasDuelByeResult,
	isDuelByePlayer,
	markDuelByeResult,
	setDuelByeBlindTarget,
} from './lobbyDuelCoordinator.js'
import { broadcastLobbyPlayerState } from './lobbyPlayerState/broadcasts.js'
import { getEnemies } from './lobbyPlayerState/queries.js'
import { reconcileActiveMatchState } from './matchResolution.js'
import { sendSystemError } from './protocol/v2/index.js'
import { handleTeamCoopBlindPlayHand } from './teamBlindFlowHandlers.js'

const normalizeHandsLeft = (handsLeft: number) =>
	Math.max(0, Math.floor(handsLeft))

const hasValidOptionalBlindTarget = (
	blindTarget: ActionHandlerArgs<ActionPlayHand>['blindTarget'],
) =>
	blindTarget === undefined ||
	(typeof blindTarget === 'string' &&
		parseFiniteInsaneInt(blindTarget) !== null)

const parseOptionalBlindTarget = (
	blindTarget: ActionHandlerArgs<ActionPlayHand>['blindTarget'],
) => typeof blindTarget === 'string'
	? parseFiniteInsaneInt(blindTarget)
	: null

export const playHandAction = (
	{ handsLeft, score, blindTarget }: ActionHandlerArgs<ActionPlayHand>,
	client: Client,
) => {
	const [lobby] = getEnemies(client)

	if (lobby === null) {
		sendSystemError(client, 'You are not in an active match.')
		return
	}

	if (!lobby.isInGame || !client.isInMatch) {
		return
	}

	if (isDuelByePlayer(lobby, client) && hasDuelByeResult(lobby, client)) {
		return
	}

	const parsedScore = parseFiniteInsaneInt(String(score))
	if (!parsedScore) {
		sendSystemError(client, 'Invalid score.')
		return
	}

	if (!hasValidOptionalBlindTarget(blindTarget)) {
		sendSystemError(client, 'Invalid blind target.')
		return
	}

	client.score = parsedScore
	client.handsLeft = normalizeHandsLeft(Number(handsLeft))
	const parsedBlindTarget = parseOptionalBlindTarget(blindTarget)
	if (parsedBlindTarget) {
		setDuelByeBlindTarget(lobby, client, parsedBlindTarget)
	}
	if (isDuelByePlayer(lobby, client)) {
		if (didDuelByeBeatBlindTarget(lobby, client)) {
			markDuelByeResult(lobby, client, true)
		} else if (parsedBlindTarget && client.handsLeft <= 0) {
			markDuelByeResult(lobby, client, false)
		}
	}

	broadcastLobbyPlayerState(lobby, client)

	if (handleTeamCoopBlindPlayHand(blindTarget, client)) {
		return
	}

	reconcileActiveMatchState(lobby)
}
