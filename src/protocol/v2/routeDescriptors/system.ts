import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverSnapshot,
} from './shared.js'

export const SYSTEM_SERVER_ROUTES = [
	'connected',
	'error',
	['version', 'requestVersion'],
] as const satisfies readonly ActionRouteSpec[]

export const SYSTEM_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes('system', PROTOCOL_V2_SCHEMA_IDS.systemHello, clientIntent, [
		['username', 'identity'],
		['rejoinLobby', 'rejoin'],
		['version', 'hello'],
		['syncClient', 'sync'],
	]),
	...actionRoutes(
		'system',
		PROTOCOL_V2_SCHEMA_IDS.systemHelloAck,
		serverSnapshot,
		SYSTEM_SERVER_ROUTES,
	),
]
