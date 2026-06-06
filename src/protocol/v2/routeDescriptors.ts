import { ENDGAME_ROUTE_ENTRIES } from './routeDescriptors/endgame.js'
import { FEATURE_ROUTE_ENTRIES } from './routeDescriptors/feature.js'
import { COOP_SAVE_ROUTE_ENTRIES } from './routeDescriptors/coopSave.js'
import { LOBBY_ROUTE_ENTRIES } from './routeDescriptors/lobby.js'
import { MATCH_ROUTE_ENTRIES } from './routeDescriptors/match.js'
import {
	type ActionName,
	type ActionRouteEntry,
	type ProtocolDescriptor,
	type ProtocolV2RouteDescriptor,
	type RouteDirection,
	assertUniqueRouteOwnership,
	buildActionLookup,
	buildProtocolDescriptorLookup,
	buildRouteLookupKey,
} from './routeDescriptors/shared.js'
import { SYNC_ROUTE_ENTRIES } from './routeDescriptors/sync.js'
import { SYSTEM_ROUTE_ENTRIES } from './routeDescriptors/system.js'
import { TEAM_ROUTE_ENTRIES } from './routeDescriptors/team.js'

export type { ProtocolV2RouteDescriptor }

const PROTOCOL_V2_ROUTE_ENTRY_FAMILIES: readonly (readonly ActionRouteEntry[])[] =
	[
		SYSTEM_ROUTE_ENTRIES,
		LOBBY_ROUTE_ENTRIES,
		MATCH_ROUTE_ENTRIES,
		TEAM_ROUTE_ENTRIES,
		SYNC_ROUTE_ENTRIES,
		ENDGAME_ROUTE_ENTRIES,
		FEATURE_ROUTE_ENTRIES,
		COOP_SAVE_ROUTE_ENTRIES,
	] as const

export const PROTOCOL_V2_ACTION_ROUTE_ENTRIES = assertUniqueRouteOwnership(
	PROTOCOL_V2_ROUTE_ENTRY_FAMILIES.flat(),
) as readonly ActionRouteEntry[]

const PROTOCOL_V2_CLIENT_DESCRIPTOR_BY_ACTION = buildActionLookup(
	PROTOCOL_V2_ACTION_ROUTE_ENTRIES,
	'client_to_server',
)

const PROTOCOL_V2_SERVER_DESCRIPTOR_BY_ACTION = buildActionLookup(
	PROTOCOL_V2_ACTION_ROUTE_ENTRIES,
	'server_to_client',
)

const PROTOCOL_V2_CLIENT_DESCRIPTOR_BY_ROUTE =
	buildProtocolDescriptorLookup(
		PROTOCOL_V2_ACTION_ROUTE_ENTRIES,
		'client_to_server',
	)

const PROTOCOL_V2_SERVER_DESCRIPTOR_BY_ROUTE =
	buildProtocolDescriptorLookup(
		PROTOCOL_V2_ACTION_ROUTE_ENTRIES,
		'server_to_client',
	)

export const findProtocolV2DescriptorForAction = (
	actionName: ActionName,
	direction: RouteDirection,
) =>
	(direction === 'client_to_server'
		? PROTOCOL_V2_CLIENT_DESCRIPTOR_BY_ACTION[actionName]
		: PROTOCOL_V2_SERVER_DESCRIPTOR_BY_ACTION[actionName]) ?? null

export const findProtocolV2DescriptorForRoute = (
	family: ProtocolDescriptor['family'],
	action: string,
	schemaId: ProtocolDescriptor['schemaId'],
	direction: RouteDirection,
) =>
	(direction === 'client_to_server'
		? PROTOCOL_V2_CLIENT_DESCRIPTOR_BY_ROUTE[
				buildRouteLookupKey(family, action, schemaId)
		  ]
		: PROTOCOL_V2_SERVER_DESCRIPTOR_BY_ROUTE[
				buildRouteLookupKey(family, action, schemaId)
		  ]) ?? null
