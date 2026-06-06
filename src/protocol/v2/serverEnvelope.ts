import type { ActionServerToClient } from '../../actions.js'
import {
	type ProtocolV2Envelope,
	createProtocolV2Envelope,
} from './messages/index.js'
import { findProtocolV2DescriptorForAction } from './routeDescriptors.js'

type ProtocolV2CapableClient = {
	sendAction: (action: ActionServerToClient) => void
	sendProtocolV2: (envelope: ProtocolV2Envelope) => void
}

const UTILITY_SERVER_ACTIONS = new Set(['keepAlive', 'keepAliveAck'])

export const buildProtocolV2EnvelopeFromAction = (
	action: ActionServerToClient,
): ProtocolV2Envelope | null => {
	const descriptor = findProtocolV2DescriptorForAction(
		action.action,
		'server_to_client',
	)
	if (!descriptor) {
		return null
	}

	const { action: _actionName, ...payload } = action as Record<
		string,
		unknown
	> & {
		action: string
	}

	return createProtocolV2Envelope(
		{
			version: 2,
			...descriptor,
		},
		payload,
	)
}

export const sendProtocolV2EnvelopeOrUtilityAction = (
	client: ProtocolV2CapableClient,
	action: ActionServerToClient,
) => {
	if (isUtilityServerAction(action.action)) {
		client.sendAction(action)
		return
	}

	const envelope = buildProtocolV2EnvelopeFromAction(action)
	if (!envelope) {
		throw new Error(
			`Missing protocol v2 descriptor for server action "${action.action}"`,
		)
	}

	client.sendProtocolV2(envelope)
}

export const isUtilityServerAction = (action: string) =>
	UTILITY_SERVER_ACTIONS.has(action)
