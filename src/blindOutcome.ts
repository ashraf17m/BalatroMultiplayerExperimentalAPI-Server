import type Lobby from './Lobby.js'
import { shouldResolveBlindNow } from './blindScoring.js'
import { resolveBlindWinnersAndLosers } from './blindWinnerSelection.js'
import { loseClientLife } from './clientState.js'
import { startDuelRound } from './lobbyDuelCoordinator.js'
import { loseLobbyTeamLife } from './lobbyPlayerState/lives.js'
import { getLobbyActivePlayers } from './lobbyPlayerState/queries.js'
import { isDuelsLobbyType } from './lobbyTypes.js'
import { resolveSoloEliminations, resolveTeamsGameOver } from './matchGameOver.js'
import {
	clearPlayerActiveBlindState,
	clearPlayerFirstReadyState,
} from './playerState.js'
import { sendMatchServerAction } from './protocol/v2/index.js'

const loseTeamPvpLives = (
	lobby: Lobby,
	losers: ReturnType<typeof resolveBlindWinnersAndLosers>['losers'],
) => {
	const eliminatedTeamIds = new Set<number>()
	const losingTeamIds = new Set(losers.map((loser) => loser.team ?? 1))

	for (const teamId of losingTeamIds) {
		const remainingLives = loseLobbyTeamLife(lobby, teamId, 'pvp_result')
		if (remainingLives <= 0) {
			eliminatedTeamIds.add(teamId)
		}
	}

	return eliminatedTeamIds
}

export const tryResolveActiveBlind = (lobby: Lobby) => {
	const players = getLobbyActivePlayers(lobby)
	if (players.length === 0) {
		return false
	}

	if (!shouldResolveBlindNow(lobby, players)) {
		return false
	}

	const { winners, losers } = resolveBlindWinnersAndLosers(lobby, players)
	for (const player of players) {
		clearPlayerActiveBlindState(player)
	}
	const eliminatedTeamIds =
		lobby.lobbyType === 'teams' ? loseTeamPvpLives(lobby, losers) : null

	if (lobby.lobbyType !== 'teams') {
		for (const loser of losers) {
			loseClientLife(loser, 'pvp_result')
		}
	}

	if (lobby.lobbyType === 'teams') {
		for (const teamId of eliminatedTeamIds ?? []) {
			resolveTeamsGameOver(lobby, teamId)
			if (!lobby.isInGame) {
				return true
			}
		}

		if ((eliminatedTeamIds?.size ?? 0) === 0 && resolveTeamsGameOver(lobby)) {
			return true
		}
	} else {
		resolveSoloEliminations(lobby, { deferDuelPairing: true })
		if (!lobby.isInGame) {
			return true
		}
	}

	for (const player of players) {
		if (!player.isInMatch) {
			continue
		}
		clearPlayerFirstReadyState(player)
		const isWinner = winners.some((winner) => winner.id === player.id)
		sendMatchServerAction(player, { action: 'endPvP', lost: !isWinner })
	}

	if (isDuelsLobbyType(lobby.lobbyType)) {
		startDuelRound(lobby, { broadcast: true })
	}

	return true
}
