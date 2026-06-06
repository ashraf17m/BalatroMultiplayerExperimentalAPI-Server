import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionModded,
	ActionModdedRequest,
} from './actions.js'
import { broadcastLobbyAction } from './lobbyBroadcasts.js'
import { isHeadToHeadLobbyType } from './lobbyTypes.js'
import { sendFeatureServerAction } from './protocol/v2/index.js'

export const moddedAction = (
	args: ActionHandlerArgs<ActionModdedRequest>,
	client: Client,
) => {
	const lobby = client.lobby
	if (
		!lobby ||
		!isHeadToHeadLobbyType(lobby.lobbyType) ||
		lobby.getPlayerCount() !== 2
	) {
		return
	}

	const players = lobby.getPlayers()
	if (!players.some((player) => player.isOwner)) return

	const opponent = players.find((player) => player.id !== client.id)
	if (!opponent) return

	const target = typeof args.target === 'string' ? args.target : undefined
	const { target: _ignoredTarget, ...rest } = args
	const message = {
		action: 'moddedAction' as const,
		fromPlayerId: client.id,
		...rest,
	} as ActionModded
	const relayTarget = target ?? 'nemesis'

	if (relayTarget === 'all') {
		broadcastLobbyAction(lobby, message)
	} else {
		sendFeatureServerAction(opponent, message)
	}
}
