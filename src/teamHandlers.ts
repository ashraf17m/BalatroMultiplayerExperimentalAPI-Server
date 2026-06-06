import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionLobbyNemesisAssignments,
	ActionLobbyPlayerTeam,
	ActionSetTeam,
	ActionSetTeamLock,
} from './actions.js'
import { MAX_TEAMS } from './constants.js'
import {
	broadcastLobbyAction,
	broadcastLobbyPlayerUpdated,
} from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { isTeamLobbyType } from './lobbyTypes.js'
import { sendSystemError } from './protocol/v2/index.js'
import {
	syncTeamDeckForClient,
	syncTeamHandLevelsForClient,
} from './teamCardSyncHandlers.js'

export const setTeamAction = (
	{ team, playerId }: ActionHandlerArgs<ActionSetTeam>,
	client: Client,
) => {
	const lobby = client.lobby
	if (!lobby) return

	if (!isTeamLobbyType(lobby.lobbyType)) {
		sendSystemError(
			client,
			'Team selection is only available in teams lobbies.',
		)
		return
	}

	if (lobby.isInGame) {
		sendSystemError(client, 'Team selection is locked once the match starts.')
		return
	}

	const requestedTargetId =
		typeof playerId === 'string' && playerId.length > 0 ? playerId : client.id
	if (requestedTargetId !== client.id && !client.isOwner) {
		sendSystemError(client, 'Only the host can change another player team.')
		return
	}

	const targetClient = lobby.getPlayer(requestedTargetId)
	if (!targetClient) {
		sendSystemError(client, 'Player not found.')
		return
	}

	if (targetClient.isTeamLocked && !client.isOwner) {
		sendSystemError(client, 'Your team color is locked by the host.')
		return
	}

	const requestedTeam = Number(team)
	if (!Number.isInteger(requestedTeam)) {
		sendSystemError(client, 'Invalid team.')
		return
	}

	const teamId = Math.max(1, Math.min(MAX_TEAMS, requestedTeam))
	if ((targetClient.team ?? 1) === teamId) {
		return
	}

	const previousNemesisByPlayerId = new Map(
		lobby.getPlayers().map(
			(player) => [player.id, player.nemesisPlayerId ?? null] as const,
		),
	)

	targetClient.team = teamId
	refreshLobbyNemesisAssignmentsForLobby(lobby)

	broadcastLobbyAction(lobby, {
		action: 'lobbyPlayerTeam',
		playerId: targetClient.id,
		team: teamId,
	} satisfies ActionLobbyPlayerTeam)

	const changedNemesisAssignments = lobby.getPlayers().flatMap((player) => {
		const previousNemesisPlayerId =
			previousNemesisByPlayerId.get(player.id) ?? null
		const nextNemesisPlayerId = player.nemesisPlayerId ?? null

		if (previousNemesisPlayerId === nextNemesisPlayerId) {
			return []
		}

		return [
			{
				playerId: player.id,
				nemesisPlayerId: nextNemesisPlayerId ?? undefined,
			},
		]
	})

	if (changedNemesisAssignments.length > 0) {
		broadcastLobbyAction(lobby, {
			action: 'lobbyNemesisAssignments',
			assignments: changedNemesisAssignments,
		} satisfies ActionLobbyNemesisAssignments)
	}

	syncTeamDeckForClient(targetClient)
	syncTeamHandLevelsForClient(targetClient)
}

export const setTeamLockAction = (
	{ playerId, locked }: ActionHandlerArgs<ActionSetTeamLock>,
	client: Client,
) => {
	const lobby = client.lobby
	if (!lobby) return

	if (!isTeamLobbyType(lobby.lobbyType)) {
		sendSystemError(client, 'Team locking is only available in teams lobbies.')
		return
	}

	if (lobby.isInGame) {
		sendSystemError(
			client,
			'Team locking is unavailable once the match starts.',
		)
		return
	}

	if (!client.isOwner) {
		sendSystemError(client, 'Only the host can lock team colors.')
		return
	}

	const targetPlayerId =
		typeof playerId === 'string' && playerId.length > 0 ? playerId : client.id
	if (targetPlayerId === client.id) {
		sendSystemError(client, 'You cannot lock your own team color.')
		return
	}

	const targetClient = lobby.getPlayer(targetPlayerId)
	if (!targetClient) {
		sendSystemError(client, 'Player not found.')
		return
	}

	const nextLocked = !!locked
	targetClient.isTeamLocked = nextLocked
	broadcastLobbyPlayerUpdated(lobby, targetClient)
}
