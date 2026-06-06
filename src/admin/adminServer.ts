import { createServer, type Socket } from 'node:net'
import {
	createAdminSignatureVerifier,
	loadAdminPublicKey,
} from './adminAuth.js'
import { type AdminHandlerMap, createAdminHandlers } from './adminCommands.js'
import { endAdminJsonLine } from './adminResponse.js'
import { handleIncomingAdminMessage } from './adminSocketDispatch.js'

export const MAX_ADMIN_MESSAGE_BYTES = 1024 * 1024

type AdminSignatureVerifier = (payload: string, signature: string) => boolean

const closeAdminSocketForInputLimit = (socket: Socket) => {
	endAdminJsonLine(socket, {
		success: false,
		error: 'Admin message exceeded size limit',
	})
}

export const createAdminSocketDataHandler = (
	socket: Socket,
	verifyAdminSignature: AdminSignatureVerifier,
	adminHandlers: AdminHandlerMap,
) => {
	let pendingMessage = ''
	let closedForInputLimit = false

	return (data: Buffer) => {
		if (closedForInputLimit) return

		pendingMessage += data.toString()
		const messages = pendingMessage.split('\n')
		pendingMessage = messages.pop() ?? ''

		if (Buffer.byteLength(pendingMessage, 'utf8') > MAX_ADMIN_MESSAGE_BYTES) {
			closedForInputLimit = true
			closeAdminSocketForInputLimit(socket)
			return
		}

		for (const msg of messages) {
			if (!msg) continue
			if (Buffer.byteLength(msg, 'utf8') > MAX_ADMIN_MESSAGE_BYTES) {
				closedForInputLimit = true
				closeAdminSocketForInputLimit(socket)
				return
			}
			handleIncomingAdminMessage(
				msg,
				socket,
				verifyAdminSignature,
				adminHandlers,
			)
		}
	}
}

export const startAdminServer = (port: number) => {
	const { key: adminPublicKey, path: adminPublicKeyPath } = loadAdminPublicKey()

	if (!adminPublicKey) {
		console.log(
			'Admin server disabled: no readable admin_public.pem found. Set ADMIN_PUBLIC_KEY_PATH or place admin_public.pem in the project root or .github directory to enable it.',
		)
		return
	}

	const verifyAdminSignature = createAdminSignatureVerifier(adminPublicKey)

	const adminHandlers = createAdminHandlers()

	const adminServer = createServer((socket) => {
		socket.on(
			'data',
			createAdminSocketDataHandler(
				socket,
				verifyAdminSignature,
				adminHandlers,
			),
		)
	})

	adminServer.listen(port, '127.0.0.1', () => {
		console.log(
			`Admin server listening on 127.0.0.1:${port} using ${adminPublicKeyPath}`,
		)
	})
}
