import { PROTOCOL_V2_SCHEMA_IDS } from '../schemaIds.js'
import {
	type ActionRouteEntry,
	type ActionRouteSpec,
	actionRoutes,
	clientIntent,
	serverSnapshot,
} from './shared.js'

export const LOBBY_SERVER_ROUTES = [
	['joinedLobby', 'joined'],
	['rejoinedLobby', 'rejoined'],
	['lobbyInfo', 'snapshot'],
	['lobbyPlayerJoined', 'playerJoined'],
	['lobbyPlayerUpdated', 'playerUpdated'],
	['lobbyPlayerLeft', 'playerLeft'],
	['lobbyTypeChanged', 'typeChanged'],
	['lobbyOptions', 'options'],
	['lobbyPlayerTeam', 'playerTeam'],
	['lobbyNemesisAssignments', 'nemesisAssignments'],
	['kickedFromLobby', 'kicked'],
	'enemyDisconnected',
	'enemyReconnected',
] as const satisfies readonly ActionRouteSpec[]

export const LOBBY_ROUTE_ENTRIES: readonly ActionRouteEntry[] = [
	...actionRoutes('lobby', PROTOCOL_V2_SCHEMA_IDS.lobbyIntent, clientIntent, [
		['createLobby', 'create'],
		['joinLobby', 'join'],
		['leaveLobby', 'leave'],
		['kickPlayer', 'kick'],
		['makePlayerHost', 'makeHost'],
		['setLobbyType', 'setType'],
		'setTeam',
		'setTeamLock',
		['readyLobby', 'ready'],
		['unreadyLobby', 'unready'],
	]),
	...actionRoutes(
		'lobby',
		PROTOCOL_V2_SCHEMA_IDS.lobbySnapshot,
		serverSnapshot,
		LOBBY_SERVER_ROUTES,
	),
]
