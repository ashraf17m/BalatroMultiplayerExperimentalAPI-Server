import type { Socket } from 'node:net'
import type Client from '../Client.js'
import { sendUtilityServerAction } from '../protocol/v2/serverSend.js'

interface SocketKeepAliveOptions {
	initialTimeout: number
	retryTimeout: number
	retryCount: number
}

export const createSocketKeepAliveManager = (
	socket: Socket,
	client: Client,
	{ initialTimeout, retryTimeout, retryCount }: SocketKeepAliveOptions,
) => {
	let isRetry = false
	let retriesUsed = 0

	const retryTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
		if (!isRetry) {
			return
		}

		sendUtilityServerAction(client, { action: 'keepAlive' })
		retriesUsed += 1

		if (retriesUsed >= retryCount) {
			socket.end()
		} else {
			retryTimer.refresh()
		}
	}, retryTimeout)

	const keepAliveTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
		sendUtilityServerAction(client, { action: 'keepAlive' })
		isRetry = true
		retryTimer.refresh()
	}, initialTimeout)

	return {
		notifyDataReceived: () => {
			isRetry = false
			retriesUsed = 0
			keepAliveTimer.refresh()
		},
		dispose: () => {
			clearTimeout(keepAliveTimer)
			clearTimeout(retryTimer)
		},
	}
}
