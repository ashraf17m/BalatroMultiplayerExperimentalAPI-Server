import type Lobby from './Lobby.js'
import { tryResolveActiveBlind } from './blindOutcome.js'
import { hasDisconnectedMatchBlocker } from './blindRules.js'
import { getLobbyActivePlayers } from './lobbyPlayerState/queries.js'
import { finalizeMatchResults, resolveTeamsGameOver } from './matchGameOver.js'

export const reconcileActiveMatchState = (
	lobby: Lobby,
): 'no_change' | 'blind_resolved' | 'game_over' => {
	if (!lobby.isInGame) {
		return 'no_change'
	}

	if (hasDisconnectedMatchBlocker(lobby)) {
		return 'no_change'
	}

	const remainingPlayers = getLobbyActivePlayers(lobby)
	if (lobby.lobbyType === 'teams' && resolveTeamsGameOver(lobby)) {
		return 'game_over'
	}

	if (remainingPlayers.length <= 1) {
		const winner = remainingPlayers[0]
		finalizeMatchResults(lobby, remainingPlayers, {
			winners: winner ? [winner] : [],
		})
		return 'game_over'
	}

	const isCoopBlindActive = remainingPlayers.some(
		(player) => player.coopBlindActive,
	)
	if (isCoopBlindActive) {
		return 'no_change'
	}

	const allActivePlayersStartedBlind = remainingPlayers.every(
		(player) => player.activeBlindStarted,
	)
	if (!allActivePlayersStartedBlind) {
		return 'no_change'
	}

	if (!tryResolveActiveBlind(lobby)) {
		return 'no_change'
	}

	return lobby.isInGame ? 'blind_resolved' : 'game_over'
}
