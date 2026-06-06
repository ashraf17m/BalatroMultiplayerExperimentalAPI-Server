import type Lobby from './Lobby.js'
import type Client from './Client.js'
import {
	getLobbyActivePlayers,
	getLobbyActiveTeamPlayers,
	isPlayerExcludedFromActiveMatch,
} from './lobbyPlayerState/queries.js'
import { isCoopLobbyType, isTeamLobbyType } from './lobbyTypes.js'

export const GLOBAL_COOP_SYNC_GROUP_ID = 0

type SharedSyncOptionKey =
	| 'team_card_sync'
	| 'team_hand_level_sync'
	| 'team_money_sync'

type SharedSyncContext = {
	lobby: Lobby
	groupId: number
}

type ActiveSharedSyncContext = SharedSyncContext & {
	peers: Client[]
}

type SharedSyncGroupMember = Pick<Client, 'lobby' | 'team'>

export const lobbyUsesSharedSyncGroup = (
	lobby: Lobby | null | undefined,
): lobby is Lobby =>
	!!lobby &&
	(isTeamLobbyType(lobby.lobbyType) || isCoopLobbyType(lobby.lobbyType))

export const isSharedSyncOptionEnabled = (
	lobby: Lobby | null | undefined,
	optionKey: SharedSyncOptionKey,
): lobby is Lobby =>
	lobbyUsesSharedSyncGroup(lobby) && lobby.options[optionKey] !== false

export const getClientSharedSyncGroupId = (client: SharedSyncGroupMember) =>
	client.lobby && isCoopLobbyType(client.lobby.lobbyType)
		? GLOBAL_COOP_SYNC_GROUP_ID
		: client.team ?? 1

export const getLobbyActiveSharedSyncGroupPlayers = (
	lobby: Lobby,
	groupId: number,
) =>
	isCoopLobbyType(lobby.lobbyType)
		? getLobbyActivePlayers(lobby)
		: getLobbyActiveTeamPlayers(lobby, groupId)

export const clientsShareSyncGroup = (
	lobby: Lobby | null | undefined,
	left: Pick<Client, 'team'>,
	right: Pick<Client, 'team'>,
) =>
	lobbyUsesSharedSyncGroup(lobby) &&
	(isCoopLobbyType(lobby.lobbyType) ||
		(left.team ?? 1) === (right.team ?? 1))

export const getClientSharedSyncReplayContext = (
	client: Client,
	optionKey: SharedSyncOptionKey,
): SharedSyncContext | null => {
	const lobby = client.lobby
	if (!isSharedSyncOptionEnabled(lobby, optionKey)) {
		return null
	}

	if (isPlayerExcludedFromActiveMatch(lobby, client)) {
		return null
	}

	return {
		lobby,
		groupId: getClientSharedSyncGroupId(client),
	}
}

export const getActiveClientSharedSyncContext = (
	client: Client,
	optionKey: SharedSyncOptionKey,
): ActiveSharedSyncContext | null => {
	const context = getClientSharedSyncReplayContext(client, optionKey)
	if (!context || !context.lobby.isInGame || !client.isInMatch) {
		return null
	}

	return {
		...context,
		peers: getLobbyActiveSharedSyncGroupPlayers(
			context.lobby,
			context.groupId,
		).filter((player) => player.id !== client.id),
	}
}
