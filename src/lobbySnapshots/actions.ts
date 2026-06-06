import type Lobby from '../Lobby.js'
import type Client from '../Client.js'
import type { LifeLossReason } from '../actionServerMatch.js'
import type {
	ActionEnemyInfo,
	ActionJoinedLobby,
	ActionLobbyInfo,
	ActionRejoinedLobby,
	LobbyOptionsWirePayload,
	LobbyPlayerWirePayload,
} from '../actions.js'
import { getLobbyTeamLives } from '../lobbyPlayerState/queries.js'
import { buildPlayersInfo } from './players.js'

const buildLobbyOptionsSnapshot = (lobby: Lobby): LobbyOptionsWirePayload => ({
	...lobby.options,
	gamemode: lobby.getClientGamemodeKey(),
})

export const buildJoinedLobbyAction = (
	lobby: Lobby,
	player: Client,
	action: 'joinedLobby' | 'rejoinedLobby',
): ActionJoinedLobby | ActionRejoinedLobby => {
	return {
		action,
		code: lobby.code,
		type: lobby.gameMode,
		lobbyType: lobby.lobbyType,
		reconnectToken: player.reconnectToken,
		playerId: player.id,
		options: buildLobbyOptionsSnapshot(lobby),
		players: buildPlayersInfo(lobby),
		isHost: player.isOwner,
		isInGame: lobby.isInGame,
		isCoopSaveRestore: lobby.coopSaveId != null,
	}
}

export const buildLobbyInfoAction = (
	lobby: Lobby,
	player: Client,
	players: LobbyPlayerWirePayload[],
): ActionLobbyInfo => ({
	action: 'lobbyInfo',
	lobbyType: lobby.lobbyType,
	players,
	isHost: player.isOwner,
	isInGame: lobby.isInGame,
	isCoopSaveRestore: lobby.coopSaveId != null,
})

export const buildEnemyInfoAction = (
	lobby: Lobby,
	player: Client,
	lifeLoss?: { reason?: LifeLossReason; previousLives?: number },
): ActionEnemyInfo => {
	const teamId = player.team ?? 1
	return {
		action: 'enemyInfo',
		playerId: player.id,
		username: player.username,
		handsLeft: player.handsLeft ?? 0,
		score:
			typeof player.score?.toString === 'function'
				? player.score.toString()
				: String(player.score ?? 0),
		skips: player.skips ?? 0,
		lives: player.lives ?? 0,
		team: player.team ?? undefined,
		teamLives:
			lobby.lobbyType === 'teams'
				? getLobbyTeamLives(lobby, teamId)
				: undefined,
		...(lifeLoss?.reason && (player.lives ?? 0) < (lifeLoss.previousLives ?? 0)
			? {
					lifeLossReason: lifeLoss.reason,
					previousLives: lifeLoss.previousLives,
				}
			: {}),
	}
}
