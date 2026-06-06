import {
	PROTOCOL_V2_VERSION,
	type ProtocolV2Direction,
	isProtocolV2Family,
} from '../families.js'
import type { ProtocolV2Envelope } from '../messages/index.js'
import {
	type ProtocolV2RouteDescriptor,
	findProtocolV2DescriptorForRoute,
} from '../routeDescriptors.js'

type ProtocolV2EnvelopeCandidate = Partial<ProtocolV2Envelope> & {
	version: typeof PROTOCOL_V2_VERSION
}

type ProtocolV2ValidationSuccess = {
	ok: true
	envelope: ProtocolV2Envelope
	descriptor: ProtocolV2RouteDescriptor
}

type ProtocolV2ValidationFailure = {
	ok: false
	reason: string
}

type ProtocolV2EnvelopeValidationResult =
	| ProtocolV2ValidationSuccess
	| ProtocolV2ValidationFailure

export const isProtocolV2EnvelopeCandidate = (
	value: unknown,
): value is ProtocolV2EnvelopeCandidate => {
	if (!value || typeof value !== 'object') return false

	const candidate = value as Partial<ProtocolV2Envelope>
	return (
		candidate.version === PROTOCOL_V2_VERSION &&
		typeof candidate.family === 'string' &&
		typeof candidate.action === 'string' &&
		typeof candidate.schemaId === 'string' &&
		!!candidate.payload &&
		typeof candidate.payload === 'object'
	)
}

export const validateProtocolV2EnvelopeForDirection = (
	value: unknown,
	direction: ProtocolV2Direction,
): ProtocolV2EnvelopeValidationResult => {
	if (!isProtocolV2EnvelopeCandidate(value)) {
		return {
			ok: false,
			reason: 'Message is not a protocol_v2 envelope candidate',
		}
	}

	const candidate = value as ProtocolV2EnvelopeCandidate & {
		family: string
		action: string
		schemaId: string
	}

	if (!isProtocolV2Family(candidate.family)) {
		return {
			ok: false,
			reason: `Unknown protocol_v2 family: ${candidate.family}`,
		}
	}

	const descriptor = findProtocolV2DescriptorForRoute(
		candidate.family,
		candidate.action,
		candidate.schemaId,
		direction,
	)
	if (!descriptor) {
		return {
			ok: false,
			reason: `Unknown protocol_v2 ${direction} route: ${candidate.family}.${candidate.action} (${candidate.schemaId})`,
		}
	}

	const expectedAuthority =
		direction === 'client_to_server' ? 'client' : 'server'
	if (descriptor.authority !== expectedAuthority) {
		return {
			ok: false,
			reason: `Invalid protocol_v2 authority for ${candidate.family}.${candidate.action}: expected ${expectedAuthority}, got ${descriptor.authority}`,
		}
	}

	return {
		ok: true,
		envelope: candidate as ProtocolV2Envelope,
		descriptor,
	}
}
