import type { Socket } from 'node:net'
import type { ActionServerToClient } from '../actions.js'
import {
	buildProtocolV2EnvelopeFromAction,
	isUtilityServerAction,
} from '../protocol/v2/index.js'
import type { ProtocolV2Envelope } from '../protocol/v2/index.js'
import {
	isFullServerPayloadLogEnabled,
	isVerboseServerLogEnabled,
	traceServerEventDeferred,
} from '../runtimeTrace.js'

type SocketLogContextProvider = () => Record<string, unknown>

const writeSocketMessage = (
	socket: Socket,
	message: Record<string, unknown>,
	logLabel: string,
	logPayload: Record<string, unknown>,
	getLogContext: SocketLogContextProvider,
	shouldLog = true,
) => {
	if (!socket || socket.destroyed) {
		return
	}

	const serializedMessage = JSON.stringify(message)
	socket.write(`${serializedMessage}\n`)

	if (shouldLog && isVerboseServerLogEnabled()) {
		const traceFields: Record<string, unknown> = {
			bytes: Buffer.byteLength(serializedMessage, 'utf8'),
			label: logLabel,
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			...getLogContext(),
		}

		if (isFullServerPayloadLogEnabled()) {
			traceFields.message = message
		} else {
			traceFields.payload = logPayload
		}

		traceServerEventDeferred('socket.outgoing', traceFields)
	}
}

export const createSocketActionSender =
	(socket: Socket, getLogContext: SocketLogContextProvider) =>
	(action: ActionServerToClient) => {
		const outgoingMessage = isUtilityServerAction(action.action)
			? action
			: buildProtocolV2EnvelopeFromAction(action)
		const { action: actionName, ...actionArgs } = action
		if (!outgoingMessage) {
			throw new Error(
				`No protocol_v2 descriptor registered for socket action "${actionName}"`,
			)
		}

		writeSocketMessage(
			socket,
			outgoingMessage as Record<string, unknown>,
			`action ${actionName}`,
			actionArgs,
			getLogContext,
			actionName !== 'keepAlive' && actionName !== 'keepAliveAck',
		)
	}

export const createSocketProtocolV2Sender =
	(socket: Socket, getLogContext: SocketLogContextProvider) =>
	(envelope: ProtocolV2Envelope) => {
		writeSocketMessage(
			socket,
			envelope as Record<string, unknown>,
			`protocol_v2 ${envelope.family}.${envelope.action}`,
			envelope.payload,
			getLogContext,
		)
	}
