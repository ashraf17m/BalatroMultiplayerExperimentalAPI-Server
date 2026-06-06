import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	actionRoutes,
	clientIntent,
	serverState,
} from './shared.js'

const FEATURE_RELAY_ACTIONS = [
	'sendPhantom',
	'removePhantom',
	'asteroid',
	'letsGoGamblingNemesis',
	'eatPizza',
	'soldJoker',
	'spentLastShop',
	'magnet',
	'magnetResponse',
	'moddedAction',
] as const

export const FEATURE_SERVER_ROUTES = [
	...FEATURE_RELAY_ACTIONS,
	'jimboAppear',
	'jimboTalk',
	'jimboMove',
	'jimboRemove',
] as const

export const FEATURE_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes(
		'feature',
		PROTOCOL_V2_SCHEMA_IDS.featureEvent,
		clientIntent,
		FEATURE_RELAY_ACTIONS,
	),
	...actionRoutes(
		'feature',
		PROTOCOL_V2_SCHEMA_IDS.featureEvent,
		serverState,
		FEATURE_SERVER_ROUTES,
	),
]
