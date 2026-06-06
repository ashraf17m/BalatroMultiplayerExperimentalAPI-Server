import type Lobby from './Lobby.js'
import type Client from './Client.js'
import { tryStartPendingBlindIfReady } from './blindReadyHandlers.js'
import { clearCoopSaveVoteForLobby } from './coopSaveHandlers.js'
import { pauseLobbyAnteTimerForControllerRelease } from './lobbyAnteTimerBroadcasts.js'
import {
	broadcastLobbyInfo,
	broadcastLobbyPlayerLeft,
} from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { reconcileActiveMatchState } from './matchResolution.js'
import { clearPlayerLobbyMembership } from './playerState.js'
import { sendLobbyServerAction } from './protocol/v2/index.js'

const assignNextOwnerIfNeeded = (lobby: Lobby, departedPlayerId: string) => {
	if (departedPlayerId !== lobby.ownerId) {
		return
	}

	const nextOwner = lobby.getFirstPlayer()
	if (!nextOwner) {
		return
	}

	lobby.setOwner(nextOwner.id)
}

const clearDisconnectedSlotIfPresent = (lobby: Lobby, playerId: string) => {
	const slot = lobby.getDisconnectedSlot(playerId)
	if (!slot) {
		return false
	}

	clearTimeout(slot.timer)
	lobby.deleteDisconnectedSlot(playerId)
	return true
}

const finalizeLobbyDepartureState = (
	lobby: Lobby,
	playerId: string,
	wasInMatch: boolean,
	removeEmptyLobby: (code: string) => void,
	options: {
		tryStartPendingBlind?: boolean
	} = {},
) => {
	const { tryStartPendingBlind = false } = options

	if (lobby.getPlayerCount() === 0) {
		removeEmptyLobby(lobby.code)
		return
	}

	assignNextOwnerIfNeeded(lobby, playerId)

	const departureResult = wasInMatch
		? reconcileActiveMatchState(lobby)
		: 'no_change'

	if (departureResult !== 'game_over') {
		refreshLobbyNemesisAssignmentsForLobby(lobby)
		if (wasInMatch || lobby.isInGame) {
			broadcastLobbyInfo(lobby)
		} else {
			broadcastLobbyPlayerLeft(lobby, playerId)
		}
	}

	if (tryStartPendingBlind) {
		tryStartPendingBlindIfReady(lobby)
	}
}

const finalizePlayerDeparture = (
	lobby: Lobby,
	client: Client,
	removeEmptyLobby: (code: string) => void,
) => {
	const wasInMatch = client.isInMatch

	clearCoopSaveVoteForLobby(lobby)
	pauseLobbyAnteTimerForControllerRelease(lobby, client.id, {
		excludedPlayerId: client.id,
	})
	clearDisconnectedSlotIfPresent(lobby, client.id)
	lobby.removePlayer(client.id)
	clearPlayerLobbyMembership(client)

	finalizeLobbyDepartureState(lobby, client.id, wasInMatch, removeEmptyLobby)
}

const finalizeDisconnectedSlotDeparture = (
	lobby: Lobby,
	playerId: string,
	wasInMatch: boolean,
	removeEmptyLobby: (code: string) => void,
) => {
	if (!clearDisconnectedSlotIfPresent(lobby, playerId)) {
		return
	}

	clearCoopSaveVoteForLobby(lobby)
	finalizeLobbyDepartureState(lobby, playerId, wasInMatch, removeEmptyLobby, {
		tryStartPendingBlind: true,
	})
}

export const leaveLobbyClient = (
	lobby: Lobby,
	client: Client,
	removeEmptyLobby: (code: string) => void,
) => {
	finalizePlayerDeparture(lobby, client, removeEmptyLobby)
}

export const kickLobbyPlayer = (
	lobby: Lobby,
	playerId: string,
	removeEmptyLobby: (code: string) => void,
) => {
	const client = lobby.getPlayer(playerId)
	if (!client) {
		const disconnectedSlot = lobby.getDisconnectedSlot(playerId)
		if (!disconnectedSlot) {
			return
		}

		finalizeDisconnectedSlotDeparture(
			lobby,
			playerId,
			disconnectedSlot.savedState.isInMatch,
			removeEmptyLobby,
		)
		return
	}

	finalizePlayerDeparture(lobby, client, removeEmptyLobby)
	sendLobbyServerAction(client, {
		action: 'kickedFromLobby',
		message: 'You have been kicked from the lobby.',
	})
}
