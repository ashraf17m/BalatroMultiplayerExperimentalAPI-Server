import type {
	ActionHandlerArgs,
	ActionGetEndGameJokersResponse,
	ActionGetNemesisDeckResponse,
	ActionReceiveEndGameJokersRequest,
	ActionReceiveNemesisDeckRequest,
} from '../../../actions.js'
import {
	getNemesisDeckAction,
	receiveNemesisDeckAction,
} from '../../../endGame/deck.js'
import {
	getEndGameJokersAction,
	receiveEndGameJokersAction,
} from '../../../endGame/jokers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_ENCODED_CARD_AREA_PAYLOAD_LENGTH,
	MAX_NEMESIS_DECK_LIST_PAYLOAD_LENGTH,
	MAX_PLAYER_ID_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	hasOptionalStringWithinLength,
	hasStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

type EndGameTargetRequestPayload = { targetPlayerId?: string }

const validateTargetRequestPayload = (
	payload: unknown,
): payload is EndGameTargetRequestPayload =>
	isRecordPayload(payload) &&
	hasOptionalStringWithinLength(payload, 'targetPlayerId', MAX_PLAYER_ID_LENGTH)

const validateReceiveEndGameJokersPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionReceiveEndGameJokersRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionReceiveEndGameJokersRequest> =>
	isRecordPayload(payload) &&
	hasStringWithinLength(payload, 'keys', MAX_ENCODED_CARD_AREA_PAYLOAD_LENGTH) &&
	hasOptionalStringWithinLength(payload, 'sourcePlayerId', MAX_PLAYER_ID_LENGTH) &&
	hasOptionalStringWithinLength(payload, 'requesterPlayerId', MAX_PLAYER_ID_LENGTH)

const validateReceiveNemesisDeckPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionReceiveNemesisDeckRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionReceiveNemesisDeckRequest> =>
	isRecordPayload(payload) &&
	hasStringWithinLength(payload, 'cards', MAX_NEMESIS_DECK_LIST_PAYLOAD_LENGTH) &&
	hasOptionalStringWithinLength(payload, 'sourcePlayerId', MAX_PLAYER_ID_LENGTH) &&
	hasOptionalStringWithinLength(payload, 'requesterPlayerId', MAX_PLAYER_ID_LENGTH)

export const ENDGAME_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionGetEndGameJokersResponse>>(
			'endgame',
			'getEndGameJokers',
			PROTOCOL_V2_SCHEMA_IDS.endgameState,
			'getEndGameJokers',
			validateTargetRequestPayload,
			() => getEndGameJokersAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionReceiveEndGameJokersRequest>>(
			'endgame',
			'receiveEndGameJokers',
			PROTOCOL_V2_SCHEMA_IDS.endgameState,
			'receiveEndGameJokers',
			validateReceiveEndGameJokersPayload,
			() => receiveEndGameJokersAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionGetNemesisDeckResponse>>(
			'endgame',
			'getNemesisDeck',
			PROTOCOL_V2_SCHEMA_IDS.endgameState,
			'getNemesisDeck',
			validateTargetRequestPayload,
			() => getNemesisDeckAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionReceiveNemesisDeckRequest>>(
			'endgame',
			'receiveNemesisDeck',
			PROTOCOL_V2_SCHEMA_IDS.endgameState,
			'receiveNemesisDeck',
			validateReceiveNemesisDeckPayload,
			() => receiveNemesisDeckAction,
		),
	]
