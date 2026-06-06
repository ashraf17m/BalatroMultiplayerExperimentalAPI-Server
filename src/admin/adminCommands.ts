import type { Socket } from 'node:net'
import { endAdminJsonLine } from './adminResponse.js'
import {
	listAdminLobbies,
	sendAdminBroadcastToTargets,
	sendAdminMessageToTargets,
} from './adminTargets.js'

export type AdminCommandPayload = {
	command?: string
	lobby_code?: string
	is_host?: boolean
	message?: string
	text?: string
	pos?: number
	payload?: string
	signature?: string
	[key: string]: unknown
}

type AdminHandler = (parsed: AdminCommandPayload, socket: Socket) => void

export type AdminHandlerMap = Record<string, AdminHandler>

const INVALID_JIMBO_POSITION = {
	success: false,
	error: 'pos must be a number 1-4',
} as const

export const createAdminHandlers = (): AdminHandlerMap => ({
	message(parsed, socket) {
		const { message, lobby_code, is_host } = parsed
		if (!message || typeof message !== 'string') {
			endAdminJsonLine(socket, { success: false, error: 'Missing message' })
			return
		}
		const result = sendAdminMessageToTargets(lobby_code, is_host, {
			action: 'error',
			message,
		})
		endAdminJsonLine(socket, result)
	},

	jimboAppear(parsed, socket) {
		const { pos, text, lobby_code, is_host } = parsed
		if (typeof pos !== 'number' || pos < 1 || pos > 4) {
			endAdminJsonLine(socket, INVALID_JIMBO_POSITION)
			return
		}
		if (text !== undefined && typeof text !== 'string') {
			endAdminJsonLine(socket, {
				success: false,
				error: 'text must be a string',
			})
			return
		}
		const result = sendAdminBroadcastToTargets(lobby_code, is_host, {
			action: 'jimboAppear',
			pos,
			text,
		})
		endAdminJsonLine(socket, result)
	},

	jimboTalk(parsed, socket) {
		const { text, lobby_code, is_host } = parsed
		if (!text || typeof text !== 'string') {
			endAdminJsonLine(socket, { success: false, error: 'Missing text' })
			return
		}
		const result = sendAdminBroadcastToTargets(lobby_code, is_host, {
			action: 'jimboTalk',
			text,
		})
		endAdminJsonLine(socket, result)
	},

	jimboMove(parsed, socket) {
		const { pos, lobby_code, is_host } = parsed
		if (typeof pos !== 'number' || pos < 1 || pos > 4) {
			endAdminJsonLine(socket, INVALID_JIMBO_POSITION)
			return
		}
		const result = sendAdminBroadcastToTargets(lobby_code, is_host, {
			action: 'jimboMove',
			pos,
		})
		endAdminJsonLine(socket, result)
	},

	jimboRemove(parsed, socket) {
		const { lobby_code, is_host } = parsed
		const result = sendAdminBroadcastToTargets(lobby_code, is_host, {
			action: 'jimboRemove',
		})
		endAdminJsonLine(socket, result)
	},

	listLobbies(_parsed, socket) {
		const lobbies = listAdminLobbies()
		endAdminJsonLine(socket, { success: true, count: lobbies.length, lobbies })
	},
})
