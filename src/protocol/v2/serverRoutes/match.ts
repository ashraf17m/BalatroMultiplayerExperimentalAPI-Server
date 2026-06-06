import type {
	ActionHandlerArgs,
	ActionLobbyOptions,
	ActionPlayHand,
	ActionReadyBlind,
	ActionReadySkipBlind,
	ActionSetAnte,
	ActionSetFurthestBlind,
	ActionSetLocation,
	ActionSkip,
} from '../../../actions.js'
import { isBlindKind, isBlindRow, isSkipBlindRow } from '../../../blindRules.js'
import { playHandAction } from '../../../blindFlowHandlers.js'
import { parseFiniteInsaneInt } from '../../../InsaneInt.js'
import {
	readyBlindAction,
	unreadyBlindAction,
} from '../../../blindReadyHandlers.js'
import {
	lobbyOptionsAction,
	startGameAction,
} from '../../../gameFlowHandlers.js'
import { returnToLobbyAction } from '../../../matchExitHandlers.js'
import {
	newRoundAction,
	setAnteAction,
	setFurthestBlindAction,
	setLocationAction,
	skipAction,
} from '../../../matchStateHandlers.js'
import {
	failRoundAction,
	failTimerAction,
} from '../../../roundFailureHandlers.js'
import {
	pauseAnteTimerAction,
	startAnteTimerAction,
} from '../../../matchAnteTimerHandlers.js'
import {
	readySkipBlindAction,
	unreadySkipBlindAction,
} from '../../../teamBlindSkipHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_BLIND_TARGET_LENGTH,
	MAX_LOCATION_LENGTH,
	MAX_SCORE_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	clientIncomingRoute,
	hasFiniteNumber,
	hasOptionalFiniteNumber,
	hasNonEmptyStringWithinLength,
	isLobbyOptionsWirePayload,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const hasParseableScoreString = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
) => {
	const score = payload[key]
	return (
		typeof score === 'string' &&
		score.length <= maxLength &&
		parseFiniteInsaneInt(score) !== null
	)
}

const hasOptionalParseableScoreString = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
) =>
	payload[key] === undefined || hasParseableScoreString(payload, key, maxLength)

const validateReadyBlindPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionReadyBlind>
> = (payload: unknown): payload is ActionHandlerArgs<ActionReadyBlind> =>
	isRecordPayload(payload) &&
	isBlindRow(payload.blindRow) &&
	isBlindKind(payload.blindKind) &&
	hasOptionalFiniteNumber(payload, 'handsLeft') &&
	hasOptionalParseableScoreString(
		payload,
		'blindTarget',
		MAX_BLIND_TARGET_LENGTH,
	)

const validateReadySkipBlindPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionReadySkipBlind>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionReadySkipBlind> =>
	isRecordPayload(payload) && isSkipBlindRow(payload.blindRow)

const validatePlayHandPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionPlayHand>
> = (payload: unknown): payload is ActionHandlerArgs<ActionPlayHand> =>
	isRecordPayload(payload) &&
	hasParseableScoreString(payload, 'score', MAX_SCORE_LENGTH) &&
	hasFiniteNumber(payload, 'handsLeft') &&
	hasOptionalParseableScoreString(
		payload,
		'blindTarget',
		MAX_BLIND_TARGET_LENGTH,
	)

const validateLobbyOptionsPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionLobbyOptions>
> = (payload: unknown): payload is ActionHandlerArgs<ActionLobbyOptions> =>
	isRecordPayload(payload) && isLobbyOptionsWirePayload(payload.options)

const validateSetAntePayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetAnte>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSetAnte> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'ante')

const validateSetLocationPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetLocation>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSetLocation> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'location', MAX_LOCATION_LENGTH)

const validateSetFurthestBlindPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSetFurthestBlind>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionSetFurthestBlind> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'furthestBlind')

const validateSkipPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSkip>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSkip> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'skips')

export const MATCH_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		clientIncomingRoute(
			'match',
			'returnToLobby',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => returnToLobbyAction,
		),
		clientIncomingRoute(
			'match',
			'startGame',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => startGameAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionReadyBlind>>(
			'match',
			'readyBlind',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'readyBlind',
			validateReadyBlindPayload,
			() => readyBlindAction,
		),
		clientIncomingRoute(
			'match',
			'unreadyBlind',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => unreadyBlindAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionReadySkipBlind>>(
			'match',
			'readySkipBlind',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'readySkipBlind',
			validateReadySkipBlindPayload,
			() => readySkipBlindAction,
		),
		clientIncomingRoute(
			'match',
			'unreadySkipBlind',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => unreadySkipBlindAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionPlayHand>>(
			'match',
			'playHand',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'playHand',
			validatePlayHandPayload,
			() => playHandAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionLobbyOptions>>(
			'match',
			'lobbyOptions',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'lobbyOptions',
			validateLobbyOptionsPayload,
			() => lobbyOptionsAction,
		),
		clientIncomingRoute(
			'match',
			'failRound',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => failRoundAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetAnte>>(
			'match',
			'setAnte',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'setAnte',
			validateSetAntePayload,
			() => setAnteAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetLocation>>(
			'match',
			'setLocation',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'setLocation',
			validateSetLocationPayload,
			() => setLocationAction,
		),
		clientIncomingRoute(
			'match',
			'newRound',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => newRoundAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSetFurthestBlind>>(
			'match',
			'setFurthestBlind',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'setFurthestBlind',
			validateSetFurthestBlindPayload,
			() => setFurthestBlindAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSkip>>(
			'match',
			'skip',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			'skip',
			validateSkipPayload,
			() => skipAction,
		),
		clientIncomingRoute(
			'match',
			'failTimer',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => failTimerAction,
		),
		clientIncomingRoute(
			'match',
			'startAnteTimer',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => startAnteTimerAction,
		),
		clientIncomingRoute(
			'match',
			'pauseAnteTimer',
			PROTOCOL_V2_SCHEMA_IDS.matchIntent,
			() => pauseAnteTimerAction,
		),
	]
