export const PROTOCOL_V2_VERSION = 2 as const

const PROTOCOL_V2_FAMILIES = [
	'system',
	'lobby',
	'match',
	'team',
	'sync',
	'endgame',
	'feature',
	'coopSave',
] as const

export type ProtocolV2Family = (typeof PROTOCOL_V2_FAMILIES)[number]

const PROTOCOL_V2_DIRECTIONS = [
	'client_to_server',
	'server_to_client',
	'bidirectional',
] as const

export type ProtocolV2Direction = (typeof PROTOCOL_V2_DIRECTIONS)[number]

const PROTOCOL_V2_AUTHORITIES = ['client', 'server', 'shared'] as const

export type ProtocolV2Authority = (typeof PROTOCOL_V2_AUTHORITIES)[number]

const PROTOCOL_V2_REPLAY_POLICIES = [
	'never',
	'event',
	'snapshot',
	'state',
] as const

export type ProtocolV2ReplayPolicy =
	(typeof PROTOCOL_V2_REPLAY_POLICIES)[number]

const PROTOCOL_V2_PERSISTENCE_POLICIES = [
	'none',
	'session',
	'resume',
	'endgame',
	'durable',
] as const

export type ProtocolV2PersistencePolicy =
	(typeof PROTOCOL_V2_PERSISTENCE_POLICIES)[number]

export const isProtocolV2Family = (value: string): value is ProtocolV2Family =>
	(PROTOCOL_V2_FAMILIES as readonly string[]).includes(value)
