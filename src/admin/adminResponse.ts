import type { Socket } from 'node:net'

export const endAdminJsonLine = (socket: Socket, payload: unknown) => {
	socket.end(`${JSON.stringify(payload)}\n`)
}
