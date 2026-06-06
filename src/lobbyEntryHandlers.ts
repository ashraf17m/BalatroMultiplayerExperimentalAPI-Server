import type Client from './Client.js'
import Lobby from './Lobby.js'
import type {
	ActionCreateLobby,
	ActionHandlerArgs,
	ActionJoinLobby,
	ActionRejoinLobby,
} from './actions.js'
import { sendInitialLobbyJoinedState } from './lobbyBroadcasts.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { applyLobbyOptions } from './lobbyOptionUpdates.js'
import { sendLobbyMatchStateToPlayer } from './lobbyPlayerState/broadcasts.js'
import {
	applyResolvedTeamBlindStateOnRejoin,
	rejoinLobbyClient,
	sendResolvedTeamBlindEndOnRejoin,
} from './lobbyReconnect/rejoin.js'
import { getLobbyByCode } from './lobbyRegistry.js'
import {
	getLobbyTypeForGameMode,
	isCoopLobbyType,
	isHeadToHeadLobbyType,
	isValidLobbyType,
} from './lobbyTypes.js'
import { getLobbyMaxPlayers } from './lobbyRules.js'
import { reconcileActiveMatchState } from './matchResolution.js'
import { sendSystemError, sendTeamServerAction } from './protocol/v2/index.js'
import {
	syncTeamDeckForClient,
	syncTeamHandLevelsForClient,
} from './teamCardSyncHandlers.js'
import { isSharedSyncOptionEnabled } from './sharedSyncGroups.js'
import { isValidGameMode } from './gameModes.js'
import { canClientJoinCoopSaveLobby } from './coopSaveHandlers.js'

const joinLobbyClient = (lobby: Lobby, client: Client) => {
	if (lobby.isInGame) {
		sendSystemError(client, 'The match has already started.')
		return false
	}

	if (!canClientJoinCoopSaveLobby(lobby, client)) {
		sendSystemError(client, 'This saved co-op lobby belongs to different players.')
		return false
	}

	const maxPlayers = getLobbyMaxPlayers(lobby)
	if (lobby.getPlayerCount() >= maxPlayers) {
		sendSystemError(
			client,
			isHeadToHeadLobbyType(lobby.lobbyType)
				? '1v1 lobby is full (2 players max).'
				: `Lobby is full (${maxPlayers} players max)`,
		)
		return false
	}

	lobby.attachFreshClient(client)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	sendInitialLobbyJoinedState(lobby, client)
	return true
}

const syncJoinedLobbyClientState = (client: Client) => {
	syncTeamDeckForClient(client)
	syncTeamHandLevelsForClient(client)

	if (isSharedSyncOptionEnabled(client.lobby, 'team_money_sync')) {
		sendTeamServerAction(client, {
			action: 'moneyUpdate',
			money: client.reportedMoney,
		})
	}
}

const withCreateOptionDefaultsForGameMode = (
	gameMode: string,
	options: ActionHandlerArgs<ActionCreateLobby>['options'],
) => {
	const suppliedOptions =
		options && typeof options === 'object' ? options : {}
	if (
		gameMode === 'survival' &&
		!Object.prototype.hasOwnProperty.call(suppliedOptions, 'starting_lives')
	) {
		return { starting_lives: 1, ...suppliedOptions }
	}

	return suppliedOptions
}

export const createLobbyAction = (
	{ gameMode, lobbyType, options }: ActionHandlerArgs<ActionCreateLobby>,
	client: Client,
) => {
	if (!isValidGameMode(gameMode)) {
		sendSystemError(client, 'Invalid game mode.')
		return
	}

	if (!isValidLobbyType(lobbyType)) {
		sendSystemError(client, 'Invalid lobby type.')
		return
	}

	if (gameMode !== 'coop' && isCoopLobbyType(lobbyType)) {
		sendSystemError(client, 'Co-op lobby type is controlled by co-op mode.')
		return
	}

	const resolvedLobbyType = getLobbyTypeForGameMode(gameMode, lobbyType)
	const lobby = new Lobby(client, gameMode, resolvedLobbyType)
	const creationOptions = withCreateOptionDefaultsForGameMode(gameMode, options)
	applyLobbyOptions(
		lobby,
		{
			gamemode: lobby.getClientGamemodeKey(),
			...creationOptions,
		},
		false,
	)
	refreshLobbyNemesisAssignmentsForLobby(lobby)
	sendInitialLobbyJoinedState(lobby, client)
}

export const joinLobbyAction = (
	{ code }: ActionHandlerArgs<ActionJoinLobby>,
	client: Client,
) => {
	const newLobby = getLobbyByCode(code)
	if (!newLobby) {
		sendSystemError(client, 'Lobby does not exist.')
		return
	}

	if (!joinLobbyClient(newLobby, client)) {
		return
	}
	syncJoinedLobbyClientState(client)
}

export const rejoinLobbyAction = (
	{ code, reconnectToken }: ActionHandlerArgs<ActionRejoinLobby>,
	client: Client,
) => {
	const lobby = getLobbyByCode(code)
	if (!lobby) {
		sendSystemError(client, 'Lobby no longer exists.')
		return
	}

	const savedState = rejoinLobbyClient(lobby, client, reconnectToken)
	if (!savedState) {
		sendSystemError(
			client,
			'Could not rejoin lobby. Token invalid or slot expired.',
		)
		return
	}

	const resolvedTeamBlindState = applyResolvedTeamBlindStateOnRejoin(
		lobby,
		client,
		savedState,
	)
	syncJoinedLobbyClientState(client)
	sendLobbyMatchStateToPlayer(lobby, client)
	sendResolvedTeamBlindEndOnRejoin(client, resolvedTeamBlindState)
	reconcileActiveMatchState(lobby)
}
