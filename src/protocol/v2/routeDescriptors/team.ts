import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

const TEAM_CLIENT_ACTIONS = ['syncMoney', 'sendTeamMoney'] as const

export const TEAM_SERVER_ROUTES = [
	['moneyUpdate', 'moneyUpdate'],
	['teamSkipBlind', 'skipBlind'],
] as const satisfies readonly ActionRouteSpec[]

export const TEAM_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes(
		'team',
		PROTOCOL_V2_SCHEMA_IDS.teamState,
		clientIntent,
		TEAM_CLIENT_ACTIONS,
	),
	...actionRoutes(
		'team',
		PROTOCOL_V2_SCHEMA_IDS.teamState,
		serverState,
		TEAM_SERVER_ROUTES,
	),
]
