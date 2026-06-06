import type { BlindKind, BlindRow } from './actions.js'

export type ActionStartGame = {
	action: 'startGame'
	deck: string
	stake?: number
	seed?: string
}
export type ActionStartBlind = {
	action: 'startBlind'
	blindRow?: BlindRow
	blindKind?: BlindKind
	duelRole?: 'pair' | 'bye'
}
export type ActionTeamSkipBlind = {
	action: 'teamSkipBlind'
	blindRow: 'Small' | 'Big'
}
export type ActionWinGame = { action: 'winGame' }
export type ActionAloneGame = { action: 'aloneGame' }
export type ActionLoseGame = { action: 'loseGame' }
export type LifeLossReason =
	| 'pvp_result'
	| 'round_failed_death_on_round_loss'
	| 'team_coop_blind_failed'
	| 'ante_timer_expired'
	| 'speedlatro_client_timeout'
export type ActionPlayerInfo = {
	action: 'playerInfo'
	lives: number
	lifeLossReason?: LifeLossReason
	previousLives?: number
	team?: number
}
export type ActionEnemyInfo = {
	action: 'enemyInfo'
	playerId: string
	username: string
	score: string
	handsLeft: number
	skips: number
	lives: number
	team?: number
	teamLives?: number
	lifeLossReason?: LifeLossReason
	previousLives?: number
}
export type ActionEndPvP = { action: 'endPvP'; lost: boolean }
export type ActionEnemyLocation = {
	action: 'enemyLocation'
	playerId: string
	username: string
	location: string
}
export type ActionSpeedrun = { action: 'speedrun' }
type AnteTimerSyncFields = {
	time?: number
	serverNow?: number
	deadlineAt?: number
	timerGeneration?: number
}
export type ActionStartAnteTimer = {
	action: 'startAnteTimer'
} & AnteTimerSyncFields
export type ActionPauseAnteTimer = {
	action: 'pauseAnteTimer'
} & AnteTimerSyncFields
export type ActionMoneyUpdate = {
	action: 'moneyUpdate'
	money?: number
	delta?: number
	sourcePlayerId?: string
}

export type ActionServerMatch =
	| ActionStartGame
	| ActionStartBlind
	| ActionTeamSkipBlind
	| ActionWinGame
	| ActionAloneGame
	| ActionLoseGame
	| ActionPlayerInfo
	| ActionEnemyInfo
	| ActionEndPvP
	| ActionEnemyLocation
	| ActionSpeedrun
	| ActionStartAnteTimer
	| ActionPauseAnteTimer
	| ActionMoneyUpdate
