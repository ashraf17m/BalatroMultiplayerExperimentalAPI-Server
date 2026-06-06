import type Client from '../../../Client.js'
import type { LobbyOptionWireValue } from '../../../actions.js'
import type { ProtocolV2Envelope } from '../messages/index.js'
import { PROTOCOL_V2_ACTION_ROUTE_ENTRIES } from '../routeDescriptors.js'
import type { ProtocolV2RouteDescriptor } from '../routeDescriptors.js'
import { buildRouteLookupKey } from '../routeDescriptors/shared.js'
import { sendSystemError } from '../serverSend/system.js'
import { MAX_OPTION_STRING_LENGTH } from './limits.js'

type IncomingProtocolV2RouteHandler = (
	envelope: ProtocolV2Envelope,
	descriptor: ProtocolV2RouteDescriptor,
	client: Client,
) => void

type IncomingProtocolV2RouteEntry = {
	family: ProtocolV2RouteDescriptor['family']
	action: ProtocolV2RouteDescriptor['action']
	schemaId: ProtocolV2RouteDescriptor['schemaId']
	payloadMode: 'none' | 'validated'
	handler: IncomingProtocolV2RouteHandler
}

type ProtocolPayloadValidator<TPayload> = (
	payload: unknown,
) => payload is TPayload

export type {
	IncomingProtocolV2RouteEntry,
	IncomingProtocolV2RouteHandler,
	ProtocolPayloadValidator,
}

export const isRecordPayload = (
	payload: unknown,
): payload is Record<string, unknown> =>
	!!payload && typeof payload === 'object' && !Array.isArray(payload)

const normalizeEmptyLuaPayload = (payload: unknown) =>
	Array.isArray(payload) && payload.length === 0 ? {} : payload

export const hasStringWithinLength = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
) => {
	const value = payload[key]
	return typeof value === 'string' && value.length <= maxLength
}

export const hasNonEmptyStringWithinLength = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
) => {
	const value = payload[key]
	return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

export const hasOptionalStringWithinLength = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
) => payload[key] === undefined || hasStringWithinLength(payload, key, maxLength)

export const hasFiniteNumber = (
	payload: Record<string, unknown>,
	key: string,
) => typeof payload[key] === 'number' && Number.isFinite(payload[key])

export const hasIntegerNumber = (
	payload: Record<string, unknown>,
	key: string,
) => typeof payload[key] === 'number' && Number.isInteger(payload[key])

export const hasOptionalFiniteNumber = (
	payload: Record<string, unknown>,
	key: string,
) => payload[key] === undefined || hasFiniteNumber(payload, key)

export const hasBoolean = (
	payload: Record<string, unknown>,
	key: string,
) => typeof payload[key] === 'boolean'

const isLobbyOptionWireValue = (
	value: unknown,
): value is LobbyOptionWireValue | undefined =>
	value === undefined ||
	value === null ||
	(typeof value === 'string' && value.length <= MAX_OPTION_STRING_LENGTH) ||
	typeof value === 'number' ||
	typeof value === 'boolean'

export const isLobbyOptionsWirePayload = (
	value: unknown,
): value is Record<string, unknown> =>
	isRecordPayload(value) && Object.values(value).every(isLobbyOptionWireValue)

export const hasOptionalLobbyOptionsWirePayload = (
	payload: Record<string, unknown>,
	key: string,
) => payload[key] === undefined || isLobbyOptionsWirePayload(payload[key])

const routeWithValidatedArgs = <TPayload>(
	routeName: string,
	validatePayload: ProtocolPayloadValidator<TPayload>,
	getHandler: () => (actionArgs: TPayload, client: Client) => void,
): IncomingProtocolV2RouteHandler => {
	return (envelope, _descriptor, client) => {
		const payload = normalizeEmptyLuaPayload(envelope.payload)
		if (!validatePayload(payload)) {
			sendSystemError(client, `Invalid protocol_v2 payload for ${routeName}.`, {
				display: 'log',
			})
			return
		}

		getHandler()(payload, client)
	}
}

const routeWithClient = (
	getHandler: () => (client: Client) => void,
): IncomingProtocolV2RouteHandler => {
	return (_envelope, _descriptor, client) => {
		getHandler()(client)
	}
}

const incomingRoute = (
	family: ProtocolV2RouteDescriptor['family'],
	action: ProtocolV2RouteDescriptor['action'],
	schemaId: ProtocolV2RouteDescriptor['schemaId'],
	payloadMode: IncomingProtocolV2RouteEntry['payloadMode'],
	handler: IncomingProtocolV2RouteHandler,
): IncomingProtocolV2RouteEntry => ({
	family,
	action,
	schemaId,
	payloadMode,
	handler,
})

export const validatedIncomingRoute = <TPayload>(
	family: ProtocolV2RouteDescriptor['family'],
	action: ProtocolV2RouteDescriptor['action'],
	schemaId: ProtocolV2RouteDescriptor['schemaId'],
	routeName: string,
	validatePayload: ProtocolPayloadValidator<TPayload>,
	getHandler: () => (actionArgs: TPayload, client: Client) => void,
): IncomingProtocolV2RouteEntry =>
	incomingRoute(
		family,
		action,
		schemaId,
		'validated',
		routeWithValidatedArgs(routeName, validatePayload, getHandler),
	)

export const clientIncomingRoute = (
	family: ProtocolV2RouteDescriptor['family'],
	action: ProtocolV2RouteDescriptor['action'],
	schemaId: ProtocolV2RouteDescriptor['schemaId'],
	getHandler: () => (client: Client) => void,
): IncomingProtocolV2RouteEntry =>
	incomingRoute(family, action, schemaId, 'none', routeWithClient(getHandler))

const buildIncomingRouteLookupKey = (entry: IncomingProtocolV2RouteEntry) =>
	buildRouteLookupKey(entry.family, entry.action, entry.schemaId)

const assertUniqueIncomingRouteOwnership = <
	TEntry extends IncomingProtocolV2RouteEntry,
>(
	entries: readonly TEntry[],
) => {
	const routeOwners = new Map<string, string>()

	for (const entry of entries) {
		const routeKey = buildIncomingRouteLookupKey(entry)
		const existingOwner = routeOwners.get(routeKey)
		if (existingOwner) {
			throw new Error(
				`Duplicate incoming protocol route ownership for ${routeKey}: ${existingOwner} and ${entry.family}.${entry.action}`,
			)
		}

		routeOwners.set(routeKey, `${entry.family}.${entry.action}`)
	}

	return entries
}

export const assertIncomingRouteCoverage = <
	TEntry extends IncomingProtocolV2RouteEntry,
>(
	entries: readonly TEntry[],
) => {
	const uniqueEntries = assertUniqueIncomingRouteOwnership(entries)
	const expectedRouteKeys = new Set(
		PROTOCOL_V2_ACTION_ROUTE_ENTRIES.filter(
			(entry) => entry.protocol.direction === 'client_to_server',
		).map((entry) =>
			buildRouteLookupKey(
				entry.protocol.family,
				entry.protocol.action,
				entry.protocol.schemaId,
			),
		),
	)
	const actualRouteKeys = new Set(
		uniqueEntries.map((entry) => buildIncomingRouteLookupKey(entry)),
	)

	for (const routeKey of expectedRouteKeys) {
		if (!actualRouteKeys.has(routeKey)) {
			throw new Error(`Missing incoming protocol route handler for ${routeKey}`)
		}
	}

	for (const routeKey of actualRouteKeys) {
		if (!expectedRouteKeys.has(routeKey)) {
			throw new Error(
				`Incoming protocol route handler has no descriptor owner for ${routeKey}`,
			)
		}
	}

	return uniqueEntries
}

export const buildIncomingRouteLookup = (
	entries: readonly IncomingProtocolV2RouteEntry[],
) =>
	Object.freeze(
		entries.reduce<Partial<Record<string, IncomingProtocolV2RouteHandler>>>(
			(acc, entry) => {
				acc[buildIncomingRouteLookupKey(entry)] = entry.handler
				return acc
			},
			{},
		),
	)
