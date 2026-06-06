import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

export const COOP_SAVE_CLIENT_ROUTES = [
	['saveCoopRun', 'save'],
	['resumeCoopSave', 'resume'],
] as const satisfies readonly ActionRouteSpec[]

export const COOP_SAVE_SERVER_ROUTES = [
	['coopSaveVote', 'vote'],
	['startCoopSave', 'start'],
] as const satisfies readonly ActionRouteSpec[]

export const COOP_SAVE_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes(
		'coopSave',
		PROTOCOL_V2_SCHEMA_IDS.coopSaveIntent,
		clientIntent,
		COOP_SAVE_CLIENT_ROUTES,
	),
	...actionRoutes(
		'coopSave',
		PROTOCOL_V2_SCHEMA_IDS.coopSaveState,
		serverState,
		COOP_SAVE_SERVER_ROUTES,
	),
]
