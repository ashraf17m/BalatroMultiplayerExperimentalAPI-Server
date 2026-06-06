import type Lobby from '../Lobby.js'
import type { LifeLossReason } from '../actionServerMatch.js'
import type Client from '../Client.js'
import { buildLobbyAnteTimerAction } from '../lobbyAnteTimer.js'
import { broadcastLobbyActionExcept } from '../lobbyBroadcasts.js'
import { buildEnemyInfoAction } from '../lobbySnapshots/actions.js'
import { isDuelsLobbyType } from '../lobbyTypes.js'
import { sendMatchServerAction } from '../protocol/v2/index.js'
import {
	getLobbyActivePlayers,
	getLobbyActiveTeamPlayers,
	isPlayerExcludedFromActiveMatch,
} from './queries.js'

const shouldSendPlayerStateToRecipient = (
	lobby: Lobby,
	player: Client,
	recipient: Client,
) => {
	if (player.id === recipient.id) {
		return false
	}

	if (!lobby.isInGame) {
		return true
	}

	if (!recipient.isInMatch) {
		return false
	}

	if (!isDuelsLobbyType(lobby.lobbyType)) {
		return true
	}

	return (
		lobby.duelState.getOpponentId(player.id) === recipient.id &&
		lobby.duelState.getOpponentId(recipient.id) === player.id
	)
}

export const broadcastLobbyPlayerState = (
	lobby: Lobby,
	player: Client,
	lifeLoss?: { reason?: LifeLossReason; previousLives?: number },
) => {
	if (isPlayerExcludedFromActiveMatch(lobby, player)) {
		return
	}

	const action = buildEnemyInfoAction(lobby, player, lifeLoss)

	if (lobby.isInGame) {
		for (const recipient of getLobbyActivePlayers(lobby)) {
			if (shouldSendPlayerStateToRecipient(lobby, player, recipient)) {
				sendMatchServerAction(recipient, action)
			}
		}
		return
	}

	broadcastLobbyActionExcept(lobby, player.id, action)
}

export const sendLobbyMatchStateToPlayer = (
	lobby: Lobby,
	recipient: Client,
) => {
	if (!lobby.isInGame || !recipient.isInMatch) {
		return
	}

	sendMatchServerAction(recipient, {
		action: 'playerInfo',
		lives: recipient.lives,
	})

	if (lobby.options?.timer) {
		sendMatchServerAction(
			recipient,
			buildLobbyAnteTimerAction(lobby, {
				includeTime: lobby.anteTimer.shouldIncludeTime(),
			}),
		)
	}

	for (const player of getLobbyActivePlayers(lobby)) {
		if (shouldSendPlayerStateToRecipient(lobby, player, recipient)) {
			sendMatchServerAction(recipient, buildEnemyInfoAction(lobby, player))
		}
	}
}

export const broadcastLobbyMatchPlayerStates = (
	lobby: Lobby,
	players: readonly Client[] = getLobbyActivePlayers(lobby),
) => {
	for (const recipient of players) {
		if (!recipient.isInMatch) {
			continue
		}

		for (const player of players) {
			if (shouldSendPlayerStateToRecipient(lobby, player, recipient)) {
				sendMatchServerAction(recipient, buildEnemyInfoAction(lobby, player))
			}
		}
	}
}

export const broadcastLobbyTeamState = (
	lobby: Lobby,
	teamId: number,
	lifeLoss?: { reason?: LifeLossReason; previousLives?: number },
) => {
	for (const player of getLobbyActiveTeamPlayers(lobby, teamId)) {
		broadcastLobbyPlayerState(lobby, player, lifeLoss)
	}
}
