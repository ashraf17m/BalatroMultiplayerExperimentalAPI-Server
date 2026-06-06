import type Client from '../../Client.js'
import type { ProtocolV2Envelope } from './messages/index.js'
import type { ProtocolV2RouteDescriptor } from './routeDescriptors.js'
import { COOP_SAVE_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/coopSave.js'
import { ENDGAME_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/endgame.js'
import { FEATURE_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/feature.js'
import { LOBBY_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/lobby.js'
import { MATCH_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/match.js'
import {
	type IncomingProtocolV2RouteEntry,
	assertIncomingRouteCoverage,
	buildIncomingRouteLookup,
} from './serverRoutes/shared.js'
import { SYNC_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/sync.js'
import { SYSTEM_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/system.js'
import { TEAM_INCOMING_PROTOCOL_ROUTE_ENTRIES } from './serverRoutes/team.js'

const PROTOCOL_V2_INCOMING_ROUTE_ENTRY_FAMILIES: readonly (readonly IncomingProtocolV2RouteEntry[])[] =
	[
		SYSTEM_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		LOBBY_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		MATCH_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		TEAM_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		SYNC_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		ENDGAME_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		FEATURE_INCOMING_PROTOCOL_ROUTE_ENTRIES,
		COOP_SAVE_INCOMING_PROTOCOL_ROUTE_ENTRIES,
	] as const

export const PROTOCOL_V2_INCOMING_ROUTE_ENTRIES = assertIncomingRouteCoverage(
	PROTOCOL_V2_INCOMING_ROUTE_ENTRY_FAMILIES.flat(),
) as readonly IncomingProtocolV2RouteEntry[]

const PROTOCOL_V2_INCOMING_ROUTE_HANDLERS_BY_ROUTE =
	buildIncomingRouteLookup(PROTOCOL_V2_INCOMING_ROUTE_ENTRIES)

const findIncomingProtocolV2RouteHandler = (
	descriptor: Pick<ProtocolV2RouteDescriptor, 'family' | 'action' | 'schemaId'>,
) =>
	PROTOCOL_V2_INCOMING_ROUTE_HANDLERS_BY_ROUTE[
		`${descriptor.family}:${descriptor.action}:${descriptor.schemaId}`
	] ?? null

export const dispatchIncomingProtocolV2Envelope = (
	envelope: ProtocolV2Envelope,
	descriptor: ProtocolV2RouteDescriptor,
	client: Client,
) => {
	const route = findIncomingProtocolV2RouteHandler(descriptor)
	if (!route) {
		return false
	}

	route(envelope, descriptor, client)
	return true
}
