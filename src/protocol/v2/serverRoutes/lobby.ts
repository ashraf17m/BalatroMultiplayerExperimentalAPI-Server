import type {
	ActionCreateLobby,
	ActionHandlerArgs,
	ActionJoinLobby,
	ActionKickPlayer,
	ActionMakePlayerHost,
	ActionSetLobbyType,
	ActionSetTeam,
	ActionSetTeamLock,
} from '../../../actions.js'
import {
	createLobbyAction,
	joinLobbyAction,
} from '../../../lobbyEntryHandlers.js'
import {
	kickPlayerAction,
	leaveLobbyAction,
	makePlayerHostAction,
} from '../../../lobbyModerationHandlers.js'
import {
	readyLobbyAction,
	unreadyLobbyAction,
} from '../../../lobbySessionHandlers.js'
import { setLobbyTypeAction } from '../../../lobbyTypeHandlers.js'
import { setTeamAction, setTeamLockAction } from '../../../teamHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_GAME_MODE_LENGTH,
	MAX_LOBBY_CODE_LENGTH,
	MAX_LOBBY_TYPE_LENGTH,
	MAX_PLAYER_ID_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	clientIncomingRoute,
	hasBoolean,
	hasIntegerNumber,
	hasOptionalLobbyOptionsWirePayload,
	hasNonEmptyStringWithinLength,
	hasOptionalStringWithinLength,
	hasStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const validateCreateLobbyPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionCreateLobby>
> = (payload: unknown): payload is ActionHandlerArgs<ActionCreateLobby> =>
	isRecordPayload(payload) &&
	hasStringWithinLength(payload, 'gameMode', MAX_GAME_MODE_LENGTH) &&
	hasStringWithinLength(payload, 'lobbyType', MAX_LOBBY_TYPE_LENGTH) &&
	hasOptionalLobbyOptionsWirePayload(payload, 'options')

const validateJoinLobbyPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionJoinLobby>
> = (payload: unknown): payload is ActionHandlerArgs<ActionJoinLobby> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'code', MAX_LOBBY_CODE_LENGTH)

const validatePlayerTargetPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionKickPlayer | ActionMakePlayerHost>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionKickPlayer | ActionMakePlayerHost> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'playerId', MAX_PLAYER_ID_LENGTH)

const validateSetLobbyTypePayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetLobbyType>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSetLobbyType> =>
	isRecordPayload(payload) &&
	hasStringWithinLength(payload, 'lobbyType', MAX_LOBBY_TYPE_LENGTH)

const validateSetTeamPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetTeam>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSetTeam> =>
	isRecordPayload(payload) &&
	hasIntegerNumber(payload, 'team') &&
	hasOptionalStringWithinLength(payload, 'playerId', MAX_PLAYER_ID_LENGTH)

const validateSetTeamLockPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetTeamLock>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSetTeamLock> =>
	isRecordPayload(payload) &&
	hasBoolean(payload, 'locked') &&
	hasOptionalStringWithinLength(payload, 'playerId', MAX_PLAYER_ID_LENGTH)

export const LOBBY_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionCreateLobby>>(
			'lobby',
			'create',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.create',
			validateCreateLobbyPayload,
			() => createLobbyAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionJoinLobby>>(
			'lobby',
			'join',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.join',
			validateJoinLobbyPayload,
			() => joinLobbyAction,
		),
		clientIncomingRoute(
			'lobby',
			'leave',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			() => leaveLobbyAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionKickPlayer>>(
			'lobby',
			'kick',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.kick',
			validatePlayerTargetPayload,
			() => kickPlayerAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionMakePlayerHost>>(
			'lobby',
			'makeHost',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.makeHost',
			validatePlayerTargetPayload,
			() => makePlayerHostAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetLobbyType>>(
			'lobby',
			'setType',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.setType',
			validateSetLobbyTypePayload,
			() => setLobbyTypeAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetTeam>>(
			'lobby',
			'setTeam',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.setTeam',
			validateSetTeamPayload,
			() => setTeamAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetTeamLock>>(
			'lobby',
			'setTeamLock',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			'lobby.setTeamLock',
			validateSetTeamLockPayload,
			() => setTeamLockAction,
		),
		clientIncomingRoute(
			'lobby',
			'ready',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			() => readyLobbyAction,
		),
		clientIncomingRoute(
			'lobby',
			'unready',
			PROTOCOL_V2_SCHEMA_IDS.lobbyIntent,
			() => unreadyLobbyAction,
		),
	]
