import type Client from '../Client.js'
import type { SavedGameState } from './shared.js'

const shouldResetReconnectReadyLocation = (location: string) => {
	return (
		location === 'loc_ready' ||
		location === 'loc_ready_teams' ||
		location.startsWith('loc_ready_for_team_row-') ||
		location.startsWith('loc_ready_to_skip_for_team_row-')
	)
}

export const buildSavedGameState = (client: Client): SavedGameState => ({
	id: client.id,
	reconnectToken: client.reconnectToken,
	lives: client.lives,
	score: client.score,
	handsLeft: client.handsLeft,
	ante: client.ante,
	skips: client.skips,
	furthestBlind: client.furthestBlind,
	money: client.reportedMoney,
	isReady: false,
	firstReady: false,
	isReadyLobby: client.isReadyLobby,
	livesBlocker: client.livesBlocker,
	location: shouldResetReconnectReadyLocation(client.location)
		? 'loc_selecting'
		: client.location,
	username: client.username,
	blindCol: client.blindCol,
	nemesisPlayerId: client.nemesisPlayerId,
	modHash: client.modHash,
	team: client.team,
	isTeamLocked: client.isTeamLocked,
	coopBlindActive: client.coopBlindActive,
	activeBlindStarted: client.activeBlindStarted,
	skipReadyBlindRow: null,
	readyBlindRow: null,
	readyBlindKind: null,
	isCached: client.isCached,
	isOwner: client.isOwner,
	isInMatch: client.isInMatch,
})

export const restoreSavedGameState = (
	client: Client,
	savedState: SavedGameState,
) => {
	client.id = savedState.id
	client.reconnectToken = savedState.reconnectToken
	client.username = savedState.username
	client.blindCol = savedState.blindCol
	client.nemesisPlayerId = savedState.nemesisPlayerId
	client.modHash = savedState.modHash
	client.isReadyLobby = savedState.isReadyLobby
	client.isReady = savedState.isReady
	client.firstReady = savedState.firstReady
	client.lives = savedState.lives
	client.score = savedState.score
	client.handsLeft = savedState.handsLeft
	client.ante = savedState.ante
	client.skips = savedState.skips
	client.furthestBlind = savedState.furthestBlind
	client.reportedMoney = savedState.money
	client.team = savedState.team
	client.isTeamLocked = savedState.isTeamLocked
	client.coopBlindActive = savedState.coopBlindActive
	client.activeBlindStarted = savedState.activeBlindStarted
	client.skipReadyBlindRow = savedState.skipReadyBlindRow
	client.readyBlindRow = savedState.readyBlindRow
	client.readyBlindKind = savedState.readyBlindKind
	client.livesBlocker = savedState.livesBlocker
	client.location = savedState.location
	client.isCached = savedState.isCached
	client.isOwner = savedState.isOwner
	client.isInMatch = savedState.isInMatch
}
