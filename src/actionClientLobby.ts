import type {
	GameMode,
	LobbyOptionsWirePayload,
	LobbyType,
} from './actionShared.js'

export type ActionUsername = {
	action: 'username'
	username: string
	blindCol?: number
	modHash: string
}
export type ActionCreateLobby = {
	action: 'createLobby'
	gameMode: GameMode
	lobbyType: LobbyType
	options?: LobbyOptionsWirePayload
}
export type ActionJoinLobby = { action: 'joinLobby'; code: string }
export type ActionLeaveLobby = { action: 'leaveLobby' }
export type ActionReturnToLobby = { action: 'returnToLobby' }
export type ActionKickPlayer = { action: 'kickPlayer'; playerId: string }
export type ActionMakePlayerHost = {
	action: 'makePlayerHost'
	playerId: string
}
export type ActionSetLobbyType = {
	action: 'setLobbyType'
	lobbyType: LobbyType
}
export type ActionSetTeam = {
	action: 'setTeam'
	team: number
	playerId?: string
}
export type ActionSetTeamLock = {
	action: 'setTeamLock'
	playerId?: string
	locked: boolean
}
export type ActionReadyLobby = { action: 'readyLobby' }
export type ActionUnreadyLobby = { action: 'unreadyLobby' }
export type ActionLobbyOptionsRequest = {
	action: 'lobbyOptions'
	options: LobbyOptionsWirePayload
}
export type ActionVersion = { action: 'version'; version: string }
export type ActionSyncClient = { action: 'syncClient'; isCached: boolean }
export type ActionRejoinLobby = {
	action: 'rejoinLobby'
	code: string
	reconnectToken: string
}

export type ActionClientLobby =
	| ActionUsername
	| ActionCreateLobby
	| ActionJoinLobby
	| ActionLeaveLobby
	| ActionReturnToLobby
	| ActionKickPlayer
	| ActionMakePlayerHost
	| ActionSetLobbyType
	| ActionSetTeam
	| ActionSetTeamLock
	| ActionReadyLobby
	| ActionUnreadyLobby
	| ActionLobbyOptionsRequest
	| ActionVersion
	| ActionSyncClient
	| ActionRejoinLobby
