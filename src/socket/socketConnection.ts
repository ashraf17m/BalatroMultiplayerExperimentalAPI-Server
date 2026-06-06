import type { Socket } from 'node:net'
import Client from '../Client.js'
import { createSocketKeepAliveManager } from './socketKeepAlive.js'
import {
	createSocketActionSender,
	createSocketProtocolV2Sender,
} from './socketSend.js'
import {
	MAX_INCOMING_BUFFER_BYTES,
	MAX_INCOMING_MESSAGE_BYTES,
} from './socketLimits.js'
import { traceServerEvent } from '../runtimeTrace.js'

/** The amount of milliseconds we wait before sending the initial keepalive packet */
const KEEP_ALIVE_INITIAL_TIMEOUT = 15000
/** The amount of milliseconds we wait after sending a new retry packet */
const KEEP_ALIVE_RETRY_TIMEOUT = 5000
/** The amount of retries we do before we declare the socket dead */
const KEEP_ALIVE_RETRY_COUNT = 4

type SocketConnectionError = Error & {
	errno?: number
	code?: string
	syscall?: string
}

type SocketDisconnectReason = 'end' | 'error' | 'input_limit'

interface SocketDisconnectContext {
	reason: SocketDisconnectReason
	error?: SocketConnectionError
}

interface SocketConnectionLifecycle {
	onConnected?: (client: Client) => void
	onDisconnected?: (client: Client, context: SocketDisconnectContext) => void
	onMessage?: (rawMessage: string, client: Client) => void
}

const EXPECTED_SOCKET_DISCONNECT_CODES = new Set([
	'ECONNRESET',
	'ECONNABORTED',
	'EPIPE',
])

const isExpectedSocketDisconnectError = (
	error?: SocketConnectionError,
) => {
	return !!error?.code && EXPECTED_SOCKET_DISCONNECT_CODES.has(error.code)
}

const buildSocketTraceFields = (socket: Socket, client: Client) => ({
	clientId: client.id,
	isInGame: client.lobby?.isInGame,
	isInMatch: client.isInMatch,
	lobbyCode: client.lobby?.code,
	localAddress: socket.localAddress,
	localPort: socket.localPort,
	remoteAddress: socket.remoteAddress,
	remotePort: socket.remotePort,
})

export const createSocketConnectionHandler =
	({
		onConnected,
		onDisconnected,
		onMessage,
	}: SocketConnectionLifecycle = {}) =>
	(socket: Socket) => {
		socket.allowHalfOpen = false
		// Do not wait for packets to buffer, helps
		// improve latency between responses
		socket.setNoDelay()
		// Enable OS-level TCP keepalive as secondary dead connection detection
		socket.setKeepAlive(true, 10000)

		let client: Client
		const getClientLogContext = () => ({ clientId: client.id })
		client = new Client(
			socket.address(),
			createSocketActionSender(socket, getClientLogContext),
			createSocketProtocolV2Sender(socket, getClientLogContext),
		)
		traceServerEvent('socket.connected', buildSocketTraceFields(socket, client))
		onConnected?.(client)

		// Buffer for incomplete TCP messages
		let dataBuffer = ''

		const keepAlive = createSocketKeepAliveManager(socket, client, {
			initialTimeout: KEEP_ALIVE_INITIAL_TIMEOUT,
			retryTimeout: KEEP_ALIVE_RETRY_TIMEOUT,
			retryCount: KEEP_ALIVE_RETRY_COUNT,
		})
		let isDisconnected = false

		const disconnectClient = (
			reason: SocketDisconnectReason,
			error?: SocketConnectionError,
		) => {
			if (isDisconnected) {
				return
			}

			isDisconnected = true
			keepAlive.dispose()

			if (reason === 'end') {
				console.log(`Client disconnected ${client.id}`)
			} else if (reason === 'input_limit') {
				console.warn(
					`Closing client ${client.id}: ${
						error?.message ?? 'incoming message exceeded the size limit'
					}`,
				)
			} else if (isExpectedSocketDisconnectError(error)) {
				console.warn(
					`Expected socket disconnect for client ${client.id} (${error?.code}).`,
				)
			} else {
				console.error(`Unexpected socket error for client ${client.id}:`, error)
			}

			traceServerEvent('socket.disconnected', {
				...buildSocketTraceFields(socket, client),
				errorCode: error?.code,
				errorMessage: error?.message,
				reason,
			})
			onDisconnected?.(client, { reason, error })
		}

		const closeForInputLimit = (message: string) => {
			traceServerEvent('socket.input_limit', {
				...buildSocketTraceFields(socket, client),
				message,
			})
			socket.end()
			disconnectClient('input_limit', new Error(message))
		}

		socket.on('data', (data) => {
			if (isDisconnected) {
				return
			}

			keepAlive.notifyDataReceived()

			// Buffer incoming data — TCP may split large messages across multiple events
			dataBuffer += data.toString()
			const messages = dataBuffer.split('\n')
			// Keep the last (possibly incomplete) chunk in the buffer
			dataBuffer = messages.pop() ?? ''

			if (Buffer.byteLength(dataBuffer, 'utf8') > MAX_INCOMING_BUFFER_BYTES) {
				closeForInputLimit(
					`incomplete socket message exceeded ${MAX_INCOMING_BUFFER_BYTES} bytes`,
				)
				return
			}

			for (const msg of messages) {
				if (!msg) continue
				if (Buffer.byteLength(msg, 'utf8') > MAX_INCOMING_MESSAGE_BYTES) {
					closeForInputLimit(
						`socket message exceeded ${MAX_INCOMING_MESSAGE_BYTES} bytes`,
					)
					return
				}
				onMessage?.(msg, client)
			}
		})

		socket.on('end', () => {
			disconnectClient('end')
		})

		socket.on('error', (error: SocketConnectionError) => {
			disconnectClient('error', error)
		})
	}
