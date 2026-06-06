import type {
	ActionKeepAlive,
	ActionKeepAliveAck,
	ActionServerToClient,
} from '../../../actions.js'
import { sendProtocolV2EnvelopeOrUtilityAction } from '../serverEnvelope.js'

type ProtocolV2CapableClient = Parameters<
	typeof sendProtocolV2EnvelopeOrUtilityAction
>[0]

export type LegacyOnlyServerAction = ActionKeepAlive | ActionKeepAliveAck

export const sendUtilityServerAction = (
	client: ProtocolV2CapableClient,
	action: LegacyOnlyServerAction,
) => {
	sendProtocolV2EnvelopeOrUtilityAction(client, action as ActionServerToClient)
}
