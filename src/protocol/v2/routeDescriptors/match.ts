import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

export const MATCH_SERVER_ROUTES = [
	'startGame',
	'startBlind',
	['endPvP', 'endPvp'],
	'enemyInfo',
	'playerInfo',
	'enemyLocation',
	'startAnteTimer',
	'pauseAnteTimer',
	'speedrun',
] as const satisfies readonly ActionRouteSpec[]

export const MATCH_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes('match', PROTOCOL_V2_SCHEMA_IDS.matchIntent, clientIntent, [
		'returnToLobby',
		'startGame',
		'readyBlind',
		'unreadyBlind',
		'readySkipBlind',
		'unreadySkipBlind',
		'playHand',
		'lobbyOptions',
		'failRound',
		'setAnte',
		'setLocation',
		'newRound',
		'setFurthestBlind',
		'skip',
		'failTimer',
		'startAnteTimer',
		'pauseAnteTimer',
	]),
	...actionRoutes(
		'match',
		PROTOCOL_V2_SCHEMA_IDS.matchState,
		serverState,
		MATCH_SERVER_ROUTES,
	),
]
