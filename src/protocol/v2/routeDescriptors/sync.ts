import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

export const SYNC_ROUTES = [
	['teamCardSync', 'teamCard'],
	['teamHandLevelSync', 'teamHandLevel'],
] as const satisfies readonly ActionRouteSpec[]

export const SYNC_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes(
		'sync',
		PROTOCOL_V2_SCHEMA_IDS.syncState,
		clientIntent,
		SYNC_ROUTES,
	),
	...actionRoutes(
		'sync',
		PROTOCOL_V2_SCHEMA_IDS.syncState,
		serverState,
		SYNC_ROUTES,
	),
]
