import {
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export const sendSystemConnected = (client: ProtocolV2CapableClient) => {
	sendProtocolServerAction(client, { action: 'connected' })
}

export const sendSystemError = (
	client: ProtocolV2CapableClient,
	message: string,
	options?: { display?: 'modal' | 'log' },
) => {
	sendProtocolServerAction(client, {
		action: 'error',
		message,
		...(options?.display ? { display: options.display } : {}),
	})
}

export const sendSystemRequestVersion = (client: ProtocolV2CapableClient) => {
	sendProtocolServerAction(client, { action: 'version' })
}
