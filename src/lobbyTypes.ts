const LOBBY_TYPES = ['1v1', 'ffa', 'teams', 'duels', 'coop'] as const
export type LobbyType = (typeof LOBBY_TYPES)[number]

export const DEFAULT_LOBBY_TYPE: LobbyType = 'ffa'
export const COOP_LOBBY_TYPE: LobbyType = 'coop'

export const isValidLobbyType = (value: string): value is LobbyType =>
	LOBBY_TYPES.includes(value as LobbyType)

export const isGroupLobbyType = (lobbyType: LobbyType): boolean =>
	lobbyType !== '1v1'

export const isHeadToHeadLobbyType = (lobbyType: LobbyType): boolean =>
	lobbyType === '1v1'

export const isTeamLobbyType = (lobbyType: LobbyType): boolean =>
	lobbyType === 'teams'

export const isDuelsLobbyType = (lobbyType: LobbyType): boolean =>
	lobbyType === 'duels'

export const isCoopLobbyType = (lobbyType: LobbyType): boolean =>
	lobbyType === COOP_LOBBY_TYPE

export const getLobbyTypeForGameMode = (
	gameMode: string,
	requestedLobbyType: LobbyType,
): LobbyType => {
	if (gameMode === 'coop') {
		return COOP_LOBBY_TYPE
	}

	return isCoopLobbyType(requestedLobbyType)
		? DEFAULT_LOBBY_TYPE
		: requestedLobbyType
}
