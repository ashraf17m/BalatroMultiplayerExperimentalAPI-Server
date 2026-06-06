import type {
	ActionHandlerArgs,
	ActionSendTeamMoney,
	ActionSyncMoney,
} from '../../../actions.js'
import {
	sendTeamMoneyAction,
	syncMoneyAction,
} from '../../../teamMoneyHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import { MAX_PLAYER_ID_LENGTH } from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	hasFiniteNumber,
	hasNonEmptyStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const validateSyncMoneyPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSyncMoney>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSyncMoney> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'money')

const validateSendTeamMoneyPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSendTeamMoney>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionSendTeamMoney> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(
		payload,
		'targetPlayerId',
		MAX_PLAYER_ID_LENGTH,
	) &&
	hasFiniteNumber(payload, 'amount') &&
	hasFiniteNumber(payload, 'money')

export const TEAM_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionSyncMoney>>(
			'team',
			'syncMoney',
			PROTOCOL_V2_SCHEMA_IDS.teamState,
			'syncMoney',
			validateSyncMoneyPayload,
			() => syncMoneyAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSendTeamMoney>>(
			'team',
			'sendTeamMoney',
			PROTOCOL_V2_SCHEMA_IDS.teamState,
			'sendTeamMoney',
			validateSendTeamMoneyPayload,
			() => sendTeamMoneyAction,
		),
	]
