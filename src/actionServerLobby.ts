import type {
	GameMode,
	LobbyNemesisAssignmentWirePayload,
	LobbyOptionsWirePayload,
	LobbyPlayerWirePayload,
	LobbyType,
} from './actionShared.js'

export type ActionConnected = { action: 'connected' }
export type ActionError = {
	action: 'error'
	message: string
	display?: 'modal' | 'log'
}
export type ActionKickedFromLobby = {
	action: 'kickedFromLobby'
	message: string
}
export type ActionJoinedLobby = {
	action: 'joinedLobby'
	code: string
	type: GameMode
	lobbyType: LobbyType
	reconnectToken?: string
	playerId: string
	options: LobbyOptionsWirePayload
	players: LobbyPlayerWirePayload[]
	isHost: boolean
	isInGame: boolean
	isCoopSaveRestore?: boolean
}
export type ActionRejoinedLobby = {
	action: 'rejoinedLobby'
	code: string
	type: GameMode
	lobbyType: LobbyType
	reconnectToken: string
	playerId: string
	options: LobbyOptionsWirePayload
	players: LobbyPlayerWirePayload[]
	isHost: boolean
	isInGame: boolean
	isCoopSaveRestore?: boolean
}
export type ActionEnemyDisconnected = {
	action: 'enemyDisconnected'
	timeout?: number
	username?: string
	playerId: string
}
export type ActionEnemyReconnected = {
	action: 'enemyReconnected'
	playerId: string
	username?: string
}
export type ActionLobbyInfo = {
	action: 'lobbyInfo'
	lobbyType: LobbyType
	players: LobbyPlayerWirePayload[]
	isHost: boolean
	isInGame: boolean
	isCoopSaveRestore?: boolean
}
export type ActionLobbyPlayerJoined = {
	action: 'lobbyPlayerJoined'
	player: LobbyPlayerWirePayload
}
export type ActionLobbyPlayerUpdated = {
	action: 'lobbyPlayerUpdated'
	player: LobbyPlayerWirePayload
}
export type ActionLobbyPlayerLeft = {
	action: 'lobbyPlayerLeft'
	playerId: string
	ownerPlayerId?: string
	isHost: boolean
	assignments?: LobbyNemesisAssignmentWirePayload[]
}
export type LobbyTypeChangedPlayerWirePayload = {
	playerId: string
	team?: number
	isTeamLocked: boolean
	isReadyLobby?: boolean
	nemesisPlayerId?: string
}
export type ActionLobbyTypeChanged = {
	action: 'lobbyTypeChanged'
	lobbyType: LobbyType
	players: LobbyTypeChangedPlayerWirePayload[]
}
export type ActionLobbyPlayerTeam = {
	action: 'lobbyPlayerTeam'
	playerId: string
	team: number
}
export type ActionLobbyNemesisAssignments = {
	action: 'lobbyNemesisAssignments'
	assignments: LobbyNemesisAssignmentWirePayload[]
}
export type ActionLobbyOptions = {
	action: 'lobbyOptions'
	options: LobbyOptionsWirePayload
}
export type ActionRequestVersion = { action: 'version' }

export type ActionServerLobby =
	| ActionConnected
	| ActionError
	| ActionKickedFromLobby
	| ActionJoinedLobby
	| ActionRejoinedLobby
	| ActionEnemyDisconnected
	| ActionEnemyReconnected
	| ActionLobbyInfo
	| ActionLobbyPlayerJoined
	| ActionLobbyPlayerUpdated
	| ActionLobbyPlayerLeft
	| ActionLobbyTypeChanged
	| ActionLobbyPlayerTeam
	| ActionLobbyNemesisAssignments
	| ActionLobbyOptions
	| ActionRequestVersion
