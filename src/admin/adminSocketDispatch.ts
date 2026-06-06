import type { Socket } from 'node:net'
import type { AdminCommandPayload, AdminHandlerMap } from './adminCommands.js'
import { endAdminJsonLine } from './adminResponse.js'

export const handleIncomingAdminMessage = (
	message: string,
	socket: Socket,
	verifyAdminSignature: (payload: string, signature: string) => boolean,
	adminHandlers: AdminHandlerMap,
) => {
	try {
		const envelope = JSON.parse(message) as AdminCommandPayload
		const { payload, signature } = envelope

		if (!payload || !signature) {
			endAdminJsonLine(socket, {
				success: false,
				error: 'Missing payload or signature',
			})
			return
		}

		if (!verifyAdminSignature(payload, signature)) {
			endAdminJsonLine(socket, { success: false, error: 'Invalid signature' })
			return
		}

		const parsed = JSON.parse(payload) as AdminCommandPayload
		const command = parsed.command ?? 'message'
		const handler = adminHandlers[command]
		if (!handler) {
			endAdminJsonLine(socket, {
				success: false,
				error: `Unknown command: ${command}`,
			})
			return
		}

		handler(parsed, socket)
	} catch {
		endAdminJsonLine(socket, { success: false, error: 'Invalid JSON' })
	}
}
