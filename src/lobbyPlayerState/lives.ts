import type Lobby from '../Lobby.js'
import type { LifeLossReason } from '../actionServerMatch.js'
import { clearPlayerReadyAndCoopBlindState } from '../playerState.js'
import { sendMatchServerAction } from '../protocol/v2/index.js'
import {
	broadcastLobbyPlayerState,
	broadcastLobbyTeamState,
} from './broadcasts.js'
import { getLobbyActiveTeamPlayers, getLobbyTeamLives } from './queries.js'

const setLobbyTeamLives = (
	lobby: Lobby,
	teamId: number,
	lives: number,
	lifeLoss?: { reason?: LifeLossReason; previousLives?: number },
) => {
	lobby.teamState.setLives(teamId, lives)

	for (const player of getLobbyActiveTeamPlayers(lobby, teamId)) {
		const previousPlayerLives = player.lives
		player.lives = lives
		sendMatchServerAction(player, {
			action: 'playerInfo',
			lives,
			team: teamId,
			...(lifeLoss?.reason && lives < previousPlayerLives
				? {
						lifeLossReason: lifeLoss.reason,
						previousLives: previousPlayerLives,
					}
				: {}),
		})
	}

	broadcastLobbyTeamState(lobby, teamId, lifeLoss)
}

export const loseLobbyTeamLife = (
	lobby: Lobby,
	teamId: number,
	reason?: LifeLossReason,
) => {
	if (lobby.teamState.hasLifeBlocker(teamId)) {
		return getLobbyTeamLives(lobby, teamId)
	}

	const previousLives = getLobbyTeamLives(lobby, teamId)
	const nextLives = Math.max(previousLives - 1, 0)
	lobby.teamState.addLifeBlocker(teamId)
	setLobbyTeamLives(lobby, teamId, nextLives, { reason, previousLives })
	return nextLives
}

export const resetLobbyTeamLifeBlocker = (lobby: Lobby, teamId: number) => {
	lobby.teamState.deleteLifeBlocker(teamId)
}

export const setLobbyPlayersLives = (lobby: Lobby, lives: number) => {
	lobby.teamState.clearMatchState()

	if (lobby.lobbyType === 'teams') {
		const activeTeams = new Set<number>()
		for (const player of lobby.getPlayers()) {
			activeTeams.add(player.team ?? 1)
		}
		for (const teamId of activeTeams) {
			lobby.teamState.setLives(teamId, lives)
		}
	}

	for (const player of lobby.getPlayers()) {
		clearPlayerReadyAndCoopBlindState(player)
		player.lives = lives
		sendMatchServerAction(player, { action: 'playerInfo', lives })
	}

	for (const player of lobby.getPlayers()) {
		broadcastLobbyPlayerState(lobby, player)
	}
}
