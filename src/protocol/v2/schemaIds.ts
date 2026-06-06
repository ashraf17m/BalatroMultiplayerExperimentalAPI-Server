export const PROTOCOL_V2_SCHEMA_IDS = {
	systemHello: 'system.hello.v2',
	systemHelloAck: 'system.helloAck.v2',
	lobbyIntent: 'lobby.intent.v2',
	lobbySnapshot: 'lobby.snapshot.v2',
	matchIntent: 'match.intent.v2',
	matchState: 'match.state.v2',
	teamState: 'team.state.v2',
	syncState: 'sync.state.v2',
	endgameState: 'endgame.state.v2',
	featureEvent: 'feature.event.v2',
	coopSaveIntent: 'coopSave.intent.v2',
	coopSaveState: 'coopSave.state.v2',
} as const

export type ProtocolV2SchemaId =
	(typeof PROTOCOL_V2_SCHEMA_IDS)[keyof typeof PROTOCOL_V2_SCHEMA_IDS]
