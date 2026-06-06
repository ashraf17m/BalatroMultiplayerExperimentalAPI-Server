import type Client from '../Client.js'
import { getEnemies } from '../lobbyPlayerState/queries.js'
import { traceRuntimeEvent } from '../runtimeTrace.js'

type ClientLobby = NonNullable<Client['lobby']>
type EndGameTraceKind = 'jokers' | 'deck'
type EndGameTraceFields = Record<string, unknown>

const traceEndGame = (
	event: string,
	client: Client,
	traceKind: EndGameTraceKind,
	lobby?: ClientLobby,
	fields: EndGameTraceFields = {},
) => {
	traceRuntimeEvent(event, {
		...fields,
		...(lobby ? { lobbyCode: lobby.code } : {}),
		clientId: client.id,
		kind: traceKind,
	})
}

type RequestEndGameSnapshotOptions<TSnapshot> = {
	client: Client
	traceKind: EndGameTraceKind
	targetPlayerId?: string
	getCachedSnapshot: (
		lobby: ClientLobby,
		sourcePlayerId: string,
	) => TSnapshot | undefined
	sendCachedSnapshot: (
		requester: Client,
		sourcePlayerId: string,
		snapshot: TSnapshot,
	) => void
	sendTargetRequest: (target: Client, requester: Client) => void
}

export const requestEndGameSnapshot = <TSnapshot>({
	client,
	targetPlayerId,
	getCachedSnapshot,
	sendCachedSnapshot,
	sendTargetRequest,
	traceKind,
}: RequestEndGameSnapshotOptions<TSnapshot>) => {
	const lobby = client.lobby
	if (!lobby) {
		traceEndGame('end_game.request_blocked', client, traceKind, undefined, {
			reason: 'no_lobby',
			targetPlayerId,
		})
		return
	}

	if (targetPlayerId) {
		const snapshot = getCachedSnapshot(lobby, targetPlayerId)
		if (snapshot !== undefined) {
			traceEndGame('end_game.request_cache_hit', client, traceKind, lobby, {
				targetPlayerId,
			})
			sendCachedSnapshot(client, targetPlayerId, snapshot)
			return
		}

		const target = lobby.getPlayer(targetPlayerId)
		if (target) {
			traceEndGame('end_game.request_relay', client, traceKind, lobby, {
				targetPlayerId,
			})
			sendTargetRequest(target, client)
		} else {
			traceEndGame('end_game.request_blocked', client, traceKind, lobby, {
				reason: 'target_not_found',
				targetPlayerId,
			})
		}
		return
	}

	const [, enemies] = getEnemies(client)
	traceEndGame('end_game.request_broadcast', client, traceKind, lobby, {
		targetCount: enemies.length,
	})
	for (const enemy of enemies) {
		sendTargetRequest(enemy, client)
	}
}

type StoreAndForwardEndGameSnapshotOptions<TSnapshot> = {
	client: Client
	traceKind: EndGameTraceKind
	sourcePlayerId?: string
	requesterPlayerId?: string
	snapshot: TSnapshot
	storeSnapshot: (
		lobby: ClientLobby,
		sourcePlayerId: string,
		snapshot: TSnapshot,
	) => void
	sendSnapshotToRequester: (
		requester: Client,
		sourcePlayerId: string,
		snapshot: TSnapshot,
	) => void
}

export const storeAndForwardEndGameSnapshot = <TSnapshot>({
	client,
	sourcePlayerId,
	requesterPlayerId,
	snapshot,
	storeSnapshot,
	sendSnapshotToRequester,
	traceKind,
}: StoreAndForwardEndGameSnapshotOptions<TSnapshot>) => {
	const lobby = client.lobby
	if (!lobby) {
		traceEndGame('end_game.response_blocked', client, traceKind, undefined, {
			reason: 'no_lobby',
			requesterPlayerId,
			sourcePlayerId,
		})
		return
	}

	const resolvedSourcePlayerId = client.id
	storeSnapshot(lobby, resolvedSourcePlayerId, snapshot)
	traceEndGame('end_game.response_stored', client, traceKind, lobby, {
		requesterPlayerId,
		reportedSourcePlayerId: sourcePlayerId,
		sourcePlayerId: resolvedSourcePlayerId,
	})

	if (!requesterPlayerId) {
		traceEndGame('end_game.response_no_requester', client, traceKind, lobby, {
			sourcePlayerId: resolvedSourcePlayerId,
		})
		return
	}

	const requester = lobby.getPlayer(requesterPlayerId)
	if (requester) {
		traceEndGame('end_game.response_forward', client, traceKind, lobby, {
			requesterPlayerId,
			sourcePlayerId: resolvedSourcePlayerId,
		})
		sendSnapshotToRequester(requester, resolvedSourcePlayerId, snapshot)
	} else {
		traceEndGame('end_game.response_not_forwarded', client, traceKind, lobby, {
			reason: 'requester_not_found',
			requesterPlayerId,
			sourcePlayerId: resolvedSourcePlayerId,
		})
	}
}
