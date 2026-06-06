import type { ActionHandlerArgs } from '../../../actions.js'
import type {
	ActionEatPizzaRequest,
	ActionMagnetResponseRequest,
	ActionModdedRequest,
	ActionRemovePhantomRequest,
	ActionSendPhantomRequest,
	ActionSpentLastShopRequest,
} from '../../../actionClientFeatureRelay.js'
import { moddedAction } from '../../../headToHeadHandlers.js'
import {
	asteroidAction,
	eatPizzaAction,
	letsGoGamblingNemesisAction,
	magnetAction,
	magnetResponseAction,
	removePhantomAction,
	sendPhantomAction,
	soldJokerAction,
	spentLastShopAction,
} from '../../../relayHandlers.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_ENCODED_CARD_PAYLOAD_LENGTH,
	MAX_FEATURE_KEY_LENGTH,
	MAX_MOD_ACTION_FIELD_LENGTH,
	MAX_PLAYER_ID_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	clientIncomingRoute,
	hasFiniteNumber,
	hasNonEmptyStringWithinLength,
	hasOptionalStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const hasOptionalFeatureTarget = (payload: Record<string, unknown>) =>
	payload.target === undefined ||
	payload.target === 'nemesis' ||
	payload.target === 'all'

const validatePhantomPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSendPhantomRequest | ActionRemovePhantomRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<
	ActionSendPhantomRequest | ActionRemovePhantomRequest
> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'key', MAX_FEATURE_KEY_LENGTH) &&
	hasOptionalStringWithinLength(payload, 'playerId', MAX_PLAYER_ID_LENGTH)

const validateEatPizzaPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionEatPizzaRequest>
> = (payload: unknown): payload is ActionHandlerArgs<ActionEatPizzaRequest> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'whole')

const validateSpentLastShopPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSpentLastShopRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionSpentLastShopRequest> =>
	isRecordPayload(payload) && hasFiniteNumber(payload, 'amount')

const validateMagnetResponsePayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionMagnetResponseRequest>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionMagnetResponseRequest> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'key', MAX_ENCODED_CARD_PAYLOAD_LENGTH)

const validateModdedPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionModdedRequest>
> = (payload: unknown): payload is ActionHandlerArgs<ActionModdedRequest> =>
	isRecordPayload(payload) &&
	hasNonEmptyStringWithinLength(payload, 'modId', MAX_MOD_ACTION_FIELD_LENGTH) &&
	hasNonEmptyStringWithinLength(payload, 'modAction', MAX_MOD_ACTION_FIELD_LENGTH) &&
	hasOptionalFeatureTarget(payload)

export const FEATURE_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionSendPhantomRequest>>(
			'feature',
			'sendPhantom',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.sendPhantom',
			validatePhantomPayload,
			() => sendPhantomAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionRemovePhantomRequest>>(
			'feature',
			'removePhantom',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.removePhantom',
			validatePhantomPayload,
			() => removePhantomAction,
		),
		clientIncomingRoute(
			'feature',
			'asteroid',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			() => asteroidAction,
		),
		clientIncomingRoute(
			'feature',
			'letsGoGamblingNemesis',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			() => letsGoGamblingNemesisAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionEatPizzaRequest>>(
			'feature',
			'eatPizza',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.eatPizza',
			validateEatPizzaPayload,
			() => eatPizzaAction,
		),
		clientIncomingRoute(
			'feature',
			'soldJoker',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			() => soldJokerAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionSpentLastShopRequest>>(
			'feature',
			'spentLastShop',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.spentLastShop',
			validateSpentLastShopPayload,
			() => spentLastShopAction,
		),
		clientIncomingRoute(
			'feature',
			'magnet',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			() => magnetAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionMagnetResponseRequest>>(
			'feature',
			'magnetResponse',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.magnetResponse',
			validateMagnetResponsePayload,
			() => magnetResponseAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionModdedRequest>>(
			'feature',
			'moddedAction',
			PROTOCOL_V2_SCHEMA_IDS.featureEvent,
			'feature.moddedAction',
			validateModdedPayload,
			() => moddedAction,
		),
	]
