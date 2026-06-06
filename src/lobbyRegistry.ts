import type Lobby from './Lobby.js'

export const Lobbies = new Map<string, Lobby>()

const LOBBY_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOBBY_CODE_LENGTH = 5

const generateLobbyCodeCandidate = () => {
	let result = ''
	for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
		result += LOBBY_CODE_CHARS.charAt(
			Math.floor(Math.random() * LOBBY_CODE_CHARS.length),
		)
	}
	return result
}

export const allocateLobbyCode = (): string => {
	let code = generateLobbyCodeCandidate()
	while (Lobbies.has(code)) {
		code = generateLobbyCodeCandidate()
	}
	return code
}

export const getLobbyByCode = (code: string) => {
	return Lobbies.get(code)
}

export const registerLobby = (lobby: Lobby) => {
	Lobbies.set(lobby.code, lobby)
}

export const removeLobbyByCode = (code: string) => {
	Lobbies.delete(code)
}
