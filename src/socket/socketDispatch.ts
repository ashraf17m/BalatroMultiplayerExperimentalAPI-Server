import type Client from '../Client.js'
import {
	dispatchIncomingProtocolV2Envelope,
	isProtocolV2EnvelopeCandidate,
	sendSystemError,
	validateProtocolV2EnvelopeForDirection,
} from '../protocol/v2/index.js'
import {
	isFullServerPayloadLogEnabled,
	isVerboseServerLogEnabled,
	traceServerEvent,
	traceServerEventDeferred,
} from '../runtimeTrace.js'
import { keepAliveAction } from '../lobbySessionHandlers.js'

type ParsedIncomingSocketMessage = Record<string, unknown> & { action: string }

type ParseIncomingSocketMessageResult =
	| { ok: true; parsed: unknown }
	| { ok: false; error: unknown }

type HandleIncomingProtocolMessageResult =
	| { kind: 'handled' }
	| {
			kind: 'invalid'
			errorMessage: string
	  }

const handleIncomingProtocolMessage = (
	message: unknown,
	client: Client,
): HandleIncomingProtocolMessageResult => {
	if (!isProtocolV2EnvelopeCandidate(message)) {
		return {
			kind: 'invalid',
			errorMessage:
				'Only protocol_v2 envelopes and keepAlive utility actions are supported',
		}
	}

	const validated = validateProtocolV2EnvelopeForDirection(
		message,
		'client_to_server',
	)
	if (!validated.ok) {
		return {
			kind: 'invalid',
			errorMessage: `Invalid protocol_v2 message: ${validated.reason}`,
		}
	}

	if (
		dispatchIncomingProtocolV2Envelope(
			validated.envelope,
			validated.descriptor,
			client,
		)
	) {
		return {
			kind: 'handled',
		}
	}

	return {
		kind: 'invalid',
		errorMessage: `Unhandled protocol_v2 route: ${validated.descriptor.family}.${validated.descriptor.action} (${validated.descriptor.schemaId})`,
	}
}

const isSocketMessageObject = (
	message: unknown,
): message is Record<string, unknown> =>
	!!message && typeof message === 'object' && !Array.isArray(message)

const isKeepAliveUtilityAction = (action: unknown) =>
	action === 'keepAlive' || action === 'keepAliveAck'

const getSocketMessageAction = (message: unknown) =>
	isSocketMessageObject(message) ? message.action : undefined

const buildIncomingTraceFields = (
	rawMessage: string,
	client: Client,
	parsed?: unknown,
): Record<string, unknown> => {
	const baseFields: Record<string, unknown> = {
		bytes: Buffer.byteLength(rawMessage, 'utf8'),
		clientId: client.id,
		isInMatch: client.isInMatch,
		lobbyCode: client.lobby?.code,
	}
	const fullPayloadLogEnabled = isFullServerPayloadLogEnabled()

	if (!isSocketMessageObject(parsed)) {
		if (fullPayloadLogEnabled) {
			baseFields.rawMessage = rawMessage
		}
		return baseFields
	}

	const fields: Record<string, unknown> = {
		...baseFields,
		action: parsed.action,
		family: parsed.family,
		schemaId: parsed.schemaId,
	}

	if (fullPayloadLogEnabled) {
		fields.message = parsed
	} else {
		fields.payload = parsed.payload
	}

	return fields
}

const parseIncomingSocketMessage = (
	rawMessage: string,
): ParseIncomingSocketMessageResult => {
	try {
		return {
			ok: true,
			parsed: JSON.parse(rawMessage) as unknown,
		}
	} catch (error) {
		return {
			ok: false,
			error,
		}
	}
}

const traceIncomingInvalidJson = (
	rawMessage: string,
	client: Client,
	error: unknown,
) => {
	traceServerEvent('socket.incoming_invalid_json', {
		...buildIncomingTraceFields(rawMessage, client),
		error: error instanceof Error ? error.message : String(error),
	})
}

const rejectIncomingSocketMessage = (
	rawMessage: string,
	client: Client,
	parsed: unknown,
	reason: string,
	options: {
		responseMessage?: string
		display?: 'modal' | 'log'
	} = {},
) => {
	traceServerEvent('socket.incoming_rejected', {
		...buildIncomingTraceFields(rawMessage, client, parsed),
		reason,
	})
	sendSystemError(client, options.responseMessage ?? reason, {
		...(options.display ? { display: options.display } : {}),
	})
}

const maybeTraceIncomingWire = (
	rawMessage: string,
	client: Client,
	parsed: unknown,
) => {
	const shouldTraceIncomingWire =
		isVerboseServerLogEnabled() &&
		!isKeepAliveUtilityAction(getSocketMessageAction(parsed))

	if (shouldTraceIncomingWire) {
		traceServerEventDeferred(
			'socket.incoming',
			buildIncomingTraceFields(rawMessage, client, parsed),
		)
	}

	return shouldTraceIncomingWire
}

const traceHandledProtocolMessage = (
	rawMessage: string,
	client: Client,
	message: ParsedIncomingSocketMessage,
	alreadyTracedWire: boolean,
) => {
	if (alreadyTracedWire) {
		return
	}

	traceServerEvent('socket.incoming_handled', {
		...buildIncomingTraceFields(rawMessage, client, message),
		route: `${String(message.family)}.${String(message.action)}`,
	})
}

const handleKeepAliveUtilityMessage = (
	action: string,
	client: Client,
) => {
	if (action === 'keepAlive') {
		keepAliveAction(client)
		return true
	}

	if (action === 'keepAliveAck') {
		return true
	}

	return false
}

const getProtocolOrUtilityOnlyError = (
	protocolMessage: HandleIncomingProtocolMessageResult,
) =>
	protocolMessage.kind === 'invalid'
		? protocolMessage.errorMessage
		: 'Only protocol_v2 envelopes and keepAlive utility actions are supported'

const dispatchParsedSocketMessage = (
	rawMessage: string,
	client: Client,
	parsed: unknown,
) => {
	const alreadyTracedWire = maybeTraceIncomingWire(rawMessage, client, parsed)
	const protocolMessage = handleIncomingProtocolMessage(parsed, client)

	if (!isSocketMessageObject(parsed)) {
		const errorMessage = getProtocolOrUtilityOnlyError(protocolMessage)
		rejectIncomingSocketMessage(rawMessage, client, parsed, errorMessage)
		return
	}

	const { action } = parsed

	if (typeof action !== 'string' || action.length === 0) {
		rejectIncomingSocketMessage(
			rawMessage,
			client,
			parsed,
			'missing_action',
			{ responseMessage: 'Failed to parse message' },
		)
		return
	}

	const message = parsed as ParsedIncomingSocketMessage
	if (protocolMessage.kind === 'handled') {
		traceHandledProtocolMessage(rawMessage, client, message, alreadyTracedWire)
		return
	}

	if (handleKeepAliveUtilityMessage(action, client)) {
		return
	}

	rejectIncomingSocketMessage(
		rawMessage,
		client,
		parsed,
		protocolMessage.errorMessage,
		{ display: 'log' },
	)
}

export const handleIncomingSocketMessage = (
	rawMessage: string,
	client: Client,
) => {
	const parsedMessage = parseIncomingSocketMessage(rawMessage)
	if (!parsedMessage.ok) {
		const failedToParseError = 'Failed to parse message'
		traceIncomingInvalidJson(rawMessage, client, parsedMessage.error)
		console.error(failedToParseError, parsedMessage.error)
		sendSystemError(client, failedToParseError)
		return
	}

	try {
		dispatchParsedSocketMessage(rawMessage, client, parsedMessage.parsed)
	} catch (error) {
		const failedToHandleError = 'Failed to handle message'
		traceServerEvent('socket.incoming_error', {
			...buildIncomingTraceFields(rawMessage, client, parsedMessage.parsed),
			error: error instanceof Error ? error.message : String(error),
		})
		console.error(failedToHandleError, error)
		sendSystemError(client, failedToHandleError)
	}
}
