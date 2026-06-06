import type { Action } from '../../../actions.js'
import type { ProtocolV2MessageDescriptor } from '../messages/index.js'

type ActionName = Action['action']
type RouteDirection = ProtocolDescriptor['direction']

type ProtocolDescriptor = Pick<
	ProtocolV2MessageDescriptor,
	| 'family'
	| 'action'
	| 'schemaId'
	| 'direction'
	| 'authority'
	| 'replay'
	| 'persistence'
>

type ActionRouteEntry = {
	actionName: ActionName
	protocol: ProtocolDescriptor
}

type ActionRouteSpec = ActionName | readonly [ActionName, string]
type ActionRouteSpecActionName<TRouteSpec> =
	TRouteSpec extends readonly [infer TActionName, string]
		? Extract<TActionName, ActionName>
		: Extract<TRouteSpec, ActionName>

type ProtocolDescriptorFactory = (
	family: ProtocolDescriptor['family'],
	action: string,
	schemaId: ProtocolDescriptor['schemaId'],
) => ProtocolDescriptor
type ProtocolDescriptorPolicy = Pick<
	ProtocolDescriptor,
	'direction' | 'authority' | 'replay' | 'persistence'
>

export type {
	ActionName,
	ActionRouteEntry,
	ActionRouteSpec,
	ActionRouteSpecActionName,
	ProtocolDescriptor,
	RouteDirection,
}

export type ProtocolV2RouteDescriptor = ProtocolDescriptor & {
	actionName: ActionName
}

const protocolDescriptorFactory =
	(policy: ProtocolDescriptorPolicy): ProtocolDescriptorFactory =>
	(family, action, schemaId) => ({
		family,
		action,
		schemaId,
		...policy,
	})

export const serverSnapshot = protocolDescriptorFactory({
	direction: 'server_to_client',
	authority: 'server',
	replay: 'snapshot',
	persistence: 'session',
})

export const serverState = protocolDescriptorFactory({
	direction: 'server_to_client',
	authority: 'server',
	replay: 'state',
	persistence: 'resume',
})

export const clientIntent = protocolDescriptorFactory({
	direction: 'client_to_server',
	authority: 'client',
	replay: 'never',
	persistence: 'none',
})

const actionRoute = (
	actionName: ActionName,
	protocol: ProtocolDescriptor,
): ActionRouteEntry => ({
	actionName,
	protocol,
})

export const actionRoutes = (
	family: ProtocolDescriptor['family'],
	schemaId: ProtocolDescriptor['schemaId'],
	buildProtocol: ProtocolDescriptorFactory,
	routes: readonly ActionRouteSpec[],
): ActionRouteEntry[] =>
	routes.map((route) => {
		const actionName = typeof route === 'string' ? route : route[0]
		const protocolAction = typeof route === 'string' ? route : route[1]

		return actionRoute(
			actionName,
			buildProtocol(family, protocolAction, schemaId),
		)
	})

export const buildRouteLookupKey = (
	family: ProtocolDescriptor['family'],
	action: string,
	schemaId: ProtocolDescriptor['schemaId'],
) => `${family}:${action}:${schemaId}`

export const assertUniqueRouteOwnership = <TEntry extends ActionRouteEntry>(
	entries: readonly TEntry[],
) => {
	const actionOwners = new Map<string, string>()
	const routeOwners = new Map<string, string>()

	for (const entry of entries) {
		const actionKey = `${entry.protocol.direction}:${entry.actionName}`
		const routeKey = `${entry.protocol.direction}:${buildRouteLookupKey(
			entry.protocol.family,
			entry.protocol.action,
			entry.protocol.schemaId,
		)}`
		const protocolTarget = `${entry.protocol.family}.${entry.protocol.action}`

		const existingActionOwner = actionOwners.get(actionKey)
		if (existingActionOwner) {
			throw new Error(
				`Duplicate protocol action ownership for ${actionKey}: ${existingActionOwner} and ${protocolTarget}`,
			)
		}

		const existingRouteOwner = routeOwners.get(routeKey)
		if (existingRouteOwner) {
			throw new Error(
				`Duplicate protocol route ownership for ${routeKey}: ${existingRouteOwner} and ${entry.actionName}`,
			)
		}

		actionOwners.set(actionKey, protocolTarget)
		routeOwners.set(routeKey, entry.actionName)
	}

	return entries
}

export const buildActionLookup = (
	entries: readonly ActionRouteEntry[],
	direction: RouteDirection,
) =>
	Object.freeze(
		entries.reduce<Partial<Record<ActionName, ProtocolDescriptor>>>(
			(acc, entry) => {
				if (entry.protocol.direction === direction) {
					acc[entry.actionName] = entry.protocol
				}

				return acc
			},
			{},
		),
	)

export const buildProtocolDescriptorLookup = (
	entries: readonly ActionRouteEntry[],
	direction: RouteDirection,
) =>
	Object.freeze(
		entries.reduce<Record<string, ProtocolV2RouteDescriptor>>((acc, entry) => {
			if (entry.protocol.direction === direction) {
				acc[
					buildRouteLookupKey(
						entry.protocol.family,
						entry.protocol.action,
						entry.protocol.schemaId,
					)
				] = {
					...entry.protocol,
					actionName: entry.actionName,
				}
			}

			return acc
		}, {}),
	)
