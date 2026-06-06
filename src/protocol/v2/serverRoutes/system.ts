import type {
	ActionHandlerArgs,
	ActionRejoinLobby,
	ActionSyncClient,
	ActionUsername,
	ActionVersion,
} from '../../../actions.js'
import { syncClientAction, versionAction } from '../../../actionMetaHandlers.js'
import { rejoinLobbyAction } from '../../../lobbyEntryHandlers.js'
import { usernameAction } from '../../../lobbySessionHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_LOBBY_CODE_LENGTH,
	MAX_MOD_HASH_LENGTH,
	MAX_RECONNECT_TOKEN_LENGTH,
	MAX_USERNAME_LENGTH,
	MAX_VERSION_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	hasBoolean,
	hasNonEmptyStringWithinLength,
	hasOptionalFiniteNumber,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const validateIdentityPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionUsername>
> = (payload: unknown): payload is ActionHandlerArgs<ActionUsername> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'username', MAX_USERNAME_LENGTH) &&
	hasNonEmptyStringWithinLength(payload, 'modHash', MAX_MOD_HASH_LENGTH) &&
	hasOptionalFiniteNumber(payload, 'blindCol')

const validateVersionPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionVersion>
> = (payload: unknown): payload is ActionHandlerArgs<ActionVersion> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'version', MAX_VERSION_LENGTH)

const validateRejoinPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionRejoinLobby>
> = (payload: unknown): payload is ActionHandlerArgs<ActionRejoinLobby> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'code', MAX_LOBBY_CODE_LENGTH) &&
	hasNonEmptyStringWithinLength(
		payload,
		'reconnectToken',
		MAX_RECONNECT_TOKEN_LENGTH,
	)

const validateSyncPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSyncClient>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSyncClient> =>
	isRecordPayload(payload) && hasBoolean(payload, 'isCached')

export const SYSTEM_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionUsername>>(
			'system',
			'identity',
			PROTOCOL_V2_SCHEMA_IDS.systemHello,
			'identity',
			validateIdentityPayload,
			() => usernameAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionVersion>>(
			'system',
			'hello',
			PROTOCOL_V2_SCHEMA_IDS.systemHello,
			'hello',
			validateVersionPayload,
			() => versionAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionRejoinLobby>>(
			'system',
			'rejoin',
			PROTOCOL_V2_SCHEMA_IDS.systemHello,
			'rejoin',
			validateRejoinPayload,
			() => rejoinLobbyAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSyncClient>>(
			'system',
			'sync',
			PROTOCOL_V2_SCHEMA_IDS.systemHello,
			'sync',
			validateSyncPayload,
			() => syncClientAction,
		),
	]
