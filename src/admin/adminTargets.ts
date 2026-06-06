import type Lobby from '../Lobby.js'
import type { ActionServerToClient } from '../actions.js'
import { Lobbies } from '../lobbyRegistry.js'
import { sendServerAction } from '../protocol/v2/index.js'

type AdminMessageAction = Extract<
	ActionServerToClient,
	{ action: 'error' }
>
type AdminTargetingResult = {
	success: boolean
	recipients?: number
	error?: string
}

const getTargetPlayers = (lobby: Lobby, isHost: boolean | undefined) => {
	const players = lobby.getPlayers()
	if (isHost === true) {
		return players.filter((player) => player.isOwner)
	}
	if (isHost === false) {
		return players.filter((player) => !player.isOwner)
	}
	return players
}

export const sendAdminBroadcastToTargets = (
	lobbyCode: string | undefined,
	isHost: boolean | undefined,
	action: ActionServerToClient,
): AdminTargetingResult => {
	let recipients = 0
	const targetLobbies: Lobby[] = []

	if (lobbyCode) {
		const lobby = Lobbies.get(lobbyCode)
		if (!lobby) return { success: false, error: 'Lobby not found' }
		targetLobbies.push(lobby)
	} else {
		targetLobbies.push(...Lobbies.values())
	}

	for (const lobby of targetLobbies) {
		for (const player of getTargetPlayers(lobby, isHost)) {
			sendServerAction(player, action)
			recipients++
		}
	}

	return { success: true, recipients }
}

export const sendAdminMessageToTargets = (
	lobbyCode: string | undefined,
	isHost: boolean | undefined,
	action: AdminMessageAction,
): AdminTargetingResult =>
	sendAdminBroadcastToTargets(lobbyCode, isHost, action)

export const listAdminLobbies = () => {
	const lobbies: string[] = []
	for (const [code, lobby] of Lobbies.entries()) {
		const players = lobby.getPlayers()
			.sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
			.map((player) => player.username)
		lobbies.push(
			players.length > 0
				? `${code} - ${players.join(', ')}`
				: `${code} - (no connected players)`,
		)
	}
	return lobbies
}
