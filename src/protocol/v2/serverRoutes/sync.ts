import type {
	ActionHandlerArgs,
	ActionTeamCardSyncRequest,
	ActionTeamHandLevelSyncRequest,
} from '../../../actions.js'
import {
	teamCardSyncAction,
	teamHandLevelSyncAction,
} from '../../../teamCardSyncHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_HAND_LEVEL_LENGTH,
	MAX_HAND_KEY_LENGTH,
	MAX_TEAM_CARD_DATA_LENGTH,
	MAX_TEAM_CARD_KEY_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	hasNonEmptyStringWithinLength,
	hasOptionalStringWithinLength,
	hasStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const isTeamCardSyncActionType = (
	actionType: unknown,
): actionType is ActionTeamCardSyncRequest['actionType'] =>
	actionType === 'sync' || actionType === 'removed'

const validateTeamCardSyncPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionTeamCardSyncRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionTeamCardSyncRequest> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(
		payload,
		'cardKey',
		MAX_TEAM_CARD_KEY_LENGTH,
	) &&
	isTeamCardSyncActionType(payload.actionType) &&
	hasOptionalStringWithinLength(
		payload,
		'cardData',
		MAX_TEAM_CARD_DATA_LENGTH,
	) &&
	(payload.actionType !== 'sync' ||
		hasStringWithinLength(payload, 'cardData', MAX_TEAM_CARD_DATA_LENGTH))

const validateTeamHandLevelSyncPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionTeamHandLevelSyncRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionTeamHandLevelSyncRequest> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'hand', MAX_HAND_KEY_LENGTH) &&
	hasNonEmptyStringWithinLength(payload, 'level', MAX_HAND_LEVEL_LENGTH)

export const SYNC_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionTeamCardSyncRequest>>(
			'sync',
			'teamCard',
			PROTOCOL_V2_SCHEMA_IDS.syncState,
			'teamCard',
			validateTeamCardSyncPayload,
			() => teamCardSyncAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionTeamHandLevelSyncRequest>>(
			'sync',
			'teamHandLevel',
			PROTOCOL_V2_SCHEMA_IDS.syncState,
			'teamHandLevel',
			validateTeamHandLevelSyncPayload,
			() => teamHandLevelSyncAction,
		),
	]
