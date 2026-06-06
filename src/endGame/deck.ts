import type Client from '../Client.js'
import type {
	ActionGetNemesisDeckResponse,
	ActionHandlerArgs,
	ActionReceiveNemesisDeckRequest,
} from '../actions.js'
import { sendEndgameServerAction } from '../protocol/v2/index.js'
import {
	requestEndGameSnapshot,
	storeAndForwardEndGameSnapshot,
} from './requestRouting.js'

export const getNemesisDeckAction = (
	{ targetPlayerId }: ActionHandlerArgs<ActionGetNemesisDeckResponse>,
	client: Client,
) => {
	requestEndGameSnapshot({
		client,
		traceKind: 'deck',
		targetPlayerId,
		getCachedSnapshot: (lobby, playerId) =>
			lobby.getEndGameSnapshot(playerId)?.deck,
		sendCachedSnapshot: (requester, sourcePlayerId, cards) => {
			sendEndgameServerAction(requester, {
				action: 'receiveNemesisDeck',
				cards,
				sourcePlayerId,
			})
		},
		sendTargetRequest: (target, requester) => {
			sendEndgameServerAction(target, {
				action: 'getNemesisDeck',
				requesterPlayerId: requester.id,
			})
		},
	})
}

export const receiveNemesisDeckAction = (
	{
		cards,
		sourcePlayerId,
		requesterPlayerId,
	}: ActionHandlerArgs<ActionReceiveNemesisDeckRequest>,
	client: Client,
) => {
	storeAndForwardEndGameSnapshot({
		client,
		traceKind: 'deck',
		sourcePlayerId,
		requesterPlayerId,
		snapshot: cards,
		storeSnapshot: (lobby, playerId, deck) =>
			lobby.storeEndGameSnapshot(playerId, { deck }),
		sendSnapshotToRequester: (
			requester,
			resolvedSourcePlayerId,
			resolvedCards,
		) => {
			sendEndgameServerAction(requester, {
				action: 'receiveNemesisDeck',
				cards: resolvedCards,
				sourcePlayerId: resolvedSourcePlayerId,
			})
		},
	})
}
