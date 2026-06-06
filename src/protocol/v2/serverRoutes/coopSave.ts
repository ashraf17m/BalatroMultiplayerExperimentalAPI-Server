import type {
	ActionHandlerArgs,
	ActionResumeCoopSave,
	ActionSaveCoopRun,
	CoopSaveRecordWirePayload,
} from '../../../actions.js'
import {
	resumeCoopSaveAction,
	saveCoopRunAction,
} from '../../../coopSaveHandlers.js'
import { parseFiniteInsaneInt } from '../../../InsaneInt.js'
import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	MAX_COOP_SAVE_ID_LENGTH,
	MAX_COOP_SAVE_SNAPSHOT_LENGTH,
	MAX_LOCATION_LENGTH,
	MAX_SCORE_LENGTH,
	MAX_USERNAME_LENGTH,
} from './limits.js'
import {
	type IncomingProtocolV2RouteEntry,
	type ProtocolPayloadValidator,
	hasFiniteNumber,
	hasNonEmptyStringWithinLength,
	hasOptionalFiniteNumber,
	hasOptionalLobbyOptionsWirePayload,
	hasOptionalStringWithinLength,
	isRecordPayload,
	validatedIncomingRoute,
} from './shared.js'

const isCoopSavePlayerPayload = (value: unknown) =>
	isRecordPayload(value) &&
	hasNonEmptyStringWithinLength(value, 'name', MAX_USERNAME_LENGTH)

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

const isCoopSaveSnapshotPayload = (value: unknown) =>
	isRecordPayload(value) &&
	hasNonEmptyStringWithinLength(
		value,
		'runData',
		MAX_COOP_SAVE_SNAPSHOT_LENGTH,
	) &&
	hasNonEmptyStringWithinLength(
		value,
		'mpStateData',
		MAX_COOP_SAVE_SNAPSHOT_LENGTH,
	) &&
	hasOptionalParseableScoreString(value, 'score', MAX_SCORE_LENGTH) &&
	hasOptionalFiniteNumber(value, 'handsLeft')

const isCoopSaveSnapshotsPayload = (value: unknown) =>
	isRecordPayload(value) &&
	Object.keys(value).every((key) => key.length > 0 && key.length <= MAX_USERNAME_LENGTH) &&
	Object.values(value).every(isCoopSaveSnapshotPayload)

const isCoopSaveRecordWirePayload = (
	value: unknown,
): value is CoopSaveRecordWirePayload =>
	isRecordPayload(value) &&
	hasNonEmptyStringWithinLength(value, 'saveId', MAX_COOP_SAVE_ID_LENGTH) &&
	hasFiniteNumber(value, 'savedAt') &&
	Array.isArray(value.players) &&
	value.players.length > 0 &&
	value.players.length <= 32 &&
	value.players.every(isCoopSavePlayerPayload) &&
	isCoopSaveSnapshotsPayload(value.snapshots) &&
	hasOptionalLobbyOptionsWirePayload(value, 'options') &&
	hasOptionalFiniteNumber(value, 'ante') &&
	hasOptionalStringWithinLength(value, 'blind', MAX_LOCATION_LENGTH) &&
	hasOptionalStringWithinLength(value, 'maxScore', MAX_SCORE_LENGTH)

const validateSaveCoopRunPayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionSaveCoopRun>
> = (payload: unknown): payload is ActionHandlerArgs<ActionSaveCoopRun> =>
	isRecordPayload(payload) &&
	(payload.cancel === true ||
		(payload.cancel !== true &&
			hasNonEmptyStringWithinLength(
				payload,
				'runData',
				MAX_COOP_SAVE_SNAPSHOT_LENGTH,
			) &&
			hasNonEmptyStringWithinLength(
				payload,
				'mpStateData',
				MAX_COOP_SAVE_SNAPSHOT_LENGTH,
			) &&
			hasOptionalFiniteNumber(payload, 'ante') &&
			hasOptionalStringWithinLength(payload, 'blind', MAX_LOCATION_LENGTH) &&
			hasOptionalStringWithinLength(payload, 'maxScore', MAX_SCORE_LENGTH) &&
			hasOptionalParseableScoreString(payload, 'score', MAX_SCORE_LENGTH) &&
			hasOptionalFiniteNumber(payload, 'handsLeft')))

const validateResumeCoopSavePayload: ProtocolPayloadValidator<
	ActionHandlerArgs<ActionResumeCoopSave>
> = (
	payload: unknown,
): payload is ActionHandlerArgs<ActionResumeCoopSave> =>
	isRecordPayload(payload) &&
	isCoopSaveRecordWirePayload(payload.save)

export const COOP_SAVE_INCOMING_PROTOCOL_ROUTE_ENTRIES: readonly IncomingProtocolV2RouteEntry[] =
	[
		validatedIncomingRoute<ActionHandlerArgs<ActionSaveCoopRun>>(
			'coopSave',
			'save',
			PROTOCOL_V2_SCHEMA_IDS.coopSaveIntent,
			'coopSave.save',
			validateSaveCoopRunPayload,
			() => saveCoopRunAction,
		),
		validatedIncomingRoute<ActionHandlerArgs<ActionResumeCoopSave>>(
			'coopSave',
			'resume',
			PROTOCOL_V2_SCHEMA_IDS.coopSaveIntent,
			'coopSave.resume',
			validateResumeCoopSavePayload,
			() => resumeCoopSaveAction,
		),
	]
