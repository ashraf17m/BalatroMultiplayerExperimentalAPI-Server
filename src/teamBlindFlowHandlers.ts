import { parseFiniteInsaneInt } from './InsaneInt.js'
import type Client from './Client.js'
import type { ActionHandlerArgs, ActionPlayHand, BlindKind } from './actions.js'
import { sumScores } from './blindScoring.js'
import {
	loseLobbyTeamLife,
	resetLobbyTeamLifeBlocker,
} from './lobbyPlayerState/lives.js'
import { broadcastLobbyMatchPlayerStates } from './lobbyPlayerState/broadcasts.js'
import { finalizeMatchResults, resolveTeamsGameOver } from './matchGameOver.js'
import {
	clearPlayerActiveBlindState,
	clearPlayerCoopBlindState,
	clearPlayerStartedBlindRuntimeState,
	preparePlayerForStartedBlind,
} from './playerState.js'
import { sendMatchServerAction } from './protocol/v2/index.js'
import { isCoopLobbyType } from './lobbyTypes.js'
import {
	getClientSharedSyncGroupId,
	getLobbyActiveSharedSyncGroupPlayers,
	lobbyUsesSharedSyncGroup,
} from './sharedSyncGroups.js'

const endTeamCoopBlind = (players: Client[], lost: boolean) =>
	players.forEach((player) => {
		clearPlayerStartedBlindRuntimeState(player)
		sendMatchServerAction(player, { action: 'endPvP', lost })
	})

const getCoopBlindGroup = (client: Client) => {
	const lobby = client.lobby
	if (!lobby) {
		return null
	}

	if (!lobbyUsesSharedSyncGroup(lobby)) {
		return null
	}

	const groupId = getClientSharedSyncGroupId(client)
	const players = getLobbyActiveSharedSyncGroupPlayers(lobby, groupId)

	if (players.length === 0) {
		return null
	}

	return { lobby, groupId, players, isGlobalCoop: isCoopLobbyType(lobby.lobbyType) }
}

const parseReportedBlindTarget = (
	blindTarget: unknown,
) => {
	if (typeof blindTarget !== 'string' || blindTarget.length === 0) {
		return null
	}

	return parseFiniteInsaneInt(blindTarget)
}

export const startTeamCoopBlindIfReady = (
	client: Client,
	blindKind: BlindKind,
	blindTarget: string | null = client.readyBlindTarget,
) => {
	if (blindKind === 'pvp') {
		return false
	}

	const group = getCoopBlindGroup(client)
	if (!group) {
		return false
	}

	const { lobby, groupId, players, isGlobalCoop } = group
	lobby.teamState.deleteBlindTarget(groupId)
	const parsedBlindTarget = parseReportedBlindTarget(blindTarget)
	if (parsedBlindTarget) {
		lobby.teamState.setBlindTarget(groupId, parsedBlindTarget)
	}
	if (isGlobalCoop) {
		lobby.teamState.clearLifeBlockers()
	} else {
		resetLobbyTeamLifeBlocker(lobby, groupId)
	}
	lobby.teamState.deleteResolvedCoopTeam(groupId)

	for (const player of players) {
		preparePlayerForStartedBlind(player, true)
	}

	for (const player of players) {
		sendMatchServerAction(player, { action: 'startBlind' })
	}
	broadcastLobbyMatchPlayerStates(lobby, players)

	return true
}

export const handleTeamCoopBlindPlayHand = (
	blindTarget: ActionHandlerArgs<ActionPlayHand>['blindTarget'],
	client: Client,
) => {
	if (!client.coopBlindActive) {
		return false
	}

	const group = getCoopBlindGroup(client)
	if (!group) {
		return false
	}

	const { lobby, groupId, players, isGlobalCoop } = group
	const parsedBlindTarget = parseReportedBlindTarget(blindTarget)
	if (parsedBlindTarget) {
		lobby.teamState.setBlindTarget(groupId, parsedBlindTarget)
	}

	if (lobby.teamState.hasResolvedCoopTeam(groupId)) {
		return true
	}

	const teamScore = sumScores(players)
	const teamBlindTarget =
		lobby.teamState.getBlindTarget(groupId) ?? parsedBlindTarget
	if (!teamBlindTarget) {
		return true
	}

	const beatBlind = !teamScore.lessThan(teamBlindTarget)

	if (beatBlind) {
		lobby.teamState.addResolvedCoopTeam(groupId)
		lobby.teamState.deleteBlindTarget(groupId)
		endTeamCoopBlind(players, false)
		return true
	}

	const allTeammatesFinished = players.every(
		(player) => player.handsLeft === 0,
	)
	if (!allTeammatesFinished) {
		return true
	}

	lobby.teamState.addResolvedCoopTeam(groupId)
	if (isGlobalCoop) {
		lobby.teamState.deleteBlindTarget(groupId)
		for (const player of players) {
			clearPlayerCoopBlindState(player)
			clearPlayerActiveBlindState(player)
		}
		finalizeMatchResults(lobby, players, { losers: players })
		return true
	}

	const remainingLives = loseLobbyTeamLife(
		lobby,
		groupId,
		'team_coop_blind_failed',
	)
	if (remainingLives <= 0) {
		lobby.teamState.deleteBlindTarget(groupId)
		for (const player of players) {
			clearPlayerCoopBlindState(player)
			clearPlayerActiveBlindState(player)
		}
		resolveTeamsGameOver(lobby, groupId)
		return true
	}

	lobby.teamState.deleteBlindTarget(groupId)
	endTeamCoopBlind(players, true)

	return true
}
