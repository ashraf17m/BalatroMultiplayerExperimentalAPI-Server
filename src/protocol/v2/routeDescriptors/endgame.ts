import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

const ENDGAME_SNAPSHOT_ACTIONS = [
	'getEndGameJokers',
	'receiveEndGameJokers',
	'getNemesisDeck',
	'receiveNemesisDeck',
] as const

const ENDGAME_RESULT_ACTION_ROUTES = [
	['winGame', 'win'],
	['aloneGame', 'alone'],
	['loseGame', 'lose'],
] as const

export const ENDGAME_SERVER_ROUTES = [
	...ENDGAME_RESULT_ACTION_ROUTES,
	...ENDGAME_SNAPSHOT_ACTIONS,
] as const

export const ENDGAME_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes(
		'endgame',
		PROTOCOL_V2_SCHEMA_IDS.endgameState,
		clientIntent,
		ENDGAME_SNAPSHOT_ACTIONS,
	),
	...actionRoutes(
		'endgame',
		PROTOCOL_V2_SCHEMA_IDS.endgameState,
		serverState,
		ENDGAME_SERVER_ROUTES,
	),
]
