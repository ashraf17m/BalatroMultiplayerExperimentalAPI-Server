import type Client from '../Client.js'
import type {
	ActionGetEndGameJokersResponse,
	ActionHandlerArgs,
	ActionReceiveEndGameJokersRequest,
} from '../actions.js'
import { sendEndgameServerAction } from '../protocol/v2/index.js'
import {
	requestEndGameSnapshot,
	storeAndForwardEndGameSnapshot,
} from './requestRouting.js'

export const getEndGameJokersAction = (
	{ targetPlayerId }: ActionHandlerArgs<ActionGetEndGameJokersResponse>,
	client: Client,
) => {
	requestEndGameSnapshot({
		client,
		traceKind: 'jokers',
		targetPlayerId,
		getCachedSnapshot: (lobby, playerId) =>
			lobby.getEndGameSnapshot(playerId)?.jokers,
		sendCachedSnapshot: (requester, sourcePlayerId, keys) => {
			sendEndgameServerAction(requester, {
				action: 'receiveEndGameJokers',
				keys,
				sourcePlayerId,
			})
		},
		sendTargetRequest: (target, requester) => {
			sendEndgameServerAction(target, {
				action: 'getEndGameJokers',
				requesterPlayerId: requester.id,
			})
		},
	})
}

export const receiveEndGameJokersAction = (
	{
		keys,
		sourcePlayerId,
		requesterPlayerId,
	}: ActionHandlerArgs<ActionReceiveEndGameJokersRequest>,
	client: Client,
) => {
	storeAndForwardEndGameSnapshot({
		client,
		traceKind: 'jokers',
		sourcePlayerId,
		requesterPlayerId,
		snapshot: keys,
		storeSnapshot: (lobby, playerId, jokers) =>
			lobby.storeEndGameSnapshot(playerId, { jokers }),
		sendSnapshotToRequester: (
			requester,
			resolvedSourcePlayerId,
			resolvedKeys,
		) => {
			sendEndgameServerAction(requester, {
				action: 'receiveEndGameJokers',
				keys: resolvedKeys,
				sourcePlayerId: resolvedSourcePlayerId,
			})
		},
	})
}
