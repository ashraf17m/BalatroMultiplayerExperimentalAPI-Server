import type {
	ProtocolV2Authority,
	ProtocolV2Direction,
	ProtocolV2Family,
	ProtocolV2PersistencePolicy,
	ProtocolV2ReplayPolicy,
} from '../families.js'
import type { ProtocolV2SchemaId } from '../schemaIds.js'

type ProtocolV2Payload = Record<string, unknown>

export type ProtocolV2MessageDescriptor = {
	version: 2
	family: ProtocolV2Family
	action: string
	schemaId: ProtocolV2SchemaId
	direction: ProtocolV2Direction
	authority: ProtocolV2Authority
	replay: ProtocolV2ReplayPolicy
	persistence: ProtocolV2PersistencePolicy
}

export type ProtocolV2Envelope<
	TPayload extends ProtocolV2Payload = ProtocolV2Payload,
> = {
	version: 2
	family: ProtocolV2Family
	action: string
	schemaId: ProtocolV2SchemaId
	payload: TPayload
}

export const createProtocolV2Envelope = <TPayload extends ProtocolV2Payload>(
	descriptor: ProtocolV2MessageDescriptor,
	payload: TPayload,
): ProtocolV2Envelope<TPayload> => ({
	version: descriptor.version,
	family: descriptor.family,
	action: descriptor.action,
	schemaId: descriptor.schemaId,
	payload,
})
