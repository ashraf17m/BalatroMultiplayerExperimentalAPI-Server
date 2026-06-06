import type { ActionServerToClient } from '../../../actions.js'
import type {
	ActionRouteSpec,
	ActionRouteSpecActionName,
} from '../routeDescriptors/shared.js'
import { sendProtocolV2EnvelopeOrUtilityAction } from '../serverEnvelope.js'

type ProtocolV2CapableClient = Parameters<
	typeof sendProtocolV2EnvelopeOrUtilityAction
>[0]

type ProtocolServerActionName = Exclude<
	ActionServerToClient['action'],
	'keepAlive' | 'keepAliveAck'
>

type ProtocolServerActionFor<TActionName extends ProtocolServerActionName> =
	Extract<ActionServerToClient, { action: TActionName }>

type ProtocolServerActionForRouteSpecs<
	TRouteSpecs extends readonly ActionRouteSpec[],
> = ProtocolServerActionFor<
	Extract<
		ActionRouteSpecActionName<TRouteSpecs[number]>,
		ProtocolServerActionName
	>
>

export type {
	ProtocolServerActionFor,
	ProtocolServerActionForRouteSpecs,
	ProtocolServerActionName,
	ProtocolV2CapableClient,
}

export const sendProtocolServerAction = (
	client: ProtocolV2CapableClient,
	action: ActionServerToClient,
) => {
	sendProtocolV2EnvelopeOrUtilityAction(client, action)
}
