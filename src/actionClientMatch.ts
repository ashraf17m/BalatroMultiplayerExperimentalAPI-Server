import type { BlindKind, BlindRow } from './actionShared.js'

export type ActionStartGameRequest = { action: 'startGame' }
export type ActionReadyBlind = {
	action: 'readyBlind'
	blindRow: BlindRow
	blindKind: BlindKind
	handsLeft?: number
	blindTarget?: string
}
export type ActionUnreadyBlind = { action: 'unreadyBlind' }
export type ActionReadySkipBlind = {
	action: 'readySkipBlind'
	blindRow: 'Small' | 'Big'
}
export type ActionUnreadySkipBlind = { action: 'unreadySkipBlind' }
export type ActionPlayHand = {
	action: 'playHand'
	score: string
	handsLeft: number
	blindTarget?: string
}
export type ActionFailRound = { action: 'failRound' }
export type ActionSetAnte = {
	action: 'setAnte'
	ante: number
}
export type ActionSetLocation = { action: 'setLocation'; location: string }
export type ActionNewRound = { action: 'newRound' }
export type ActionSetFurthestBlind = {
	action: 'setFurthestBlind'
	furthestBlind: number
}
export type ActionSkip = {
	action: 'skip'
	skips: number
}
export type ActionStartAnteTimerRequest = { action: 'startAnteTimer' }
export type ActionPauseAnteTimerRequest = { action: 'pauseAnteTimer' }
export type ActionFailTimer = { action: 'failTimer' }
export type ActionSyncMoney = { action: 'syncMoney'; money: number }
export type ActionSendTeamMoney = {
	action: 'sendTeamMoney'
	targetPlayerId: string
	amount: number
	money: number
}

export type ActionClientMatch =
	| ActionStartGameRequest
	| ActionReadyBlind
	| ActionUnreadyBlind
	| ActionReadySkipBlind
	| ActionUnreadySkipBlind
	| ActionPlayHand
	| ActionFailRound
	| ActionSetAnte
	| ActionSetLocation
	| ActionNewRound
	| ActionSetFurthestBlind
	| ActionSkip
	| ActionStartAnteTimerRequest
	| ActionPauseAnteTimerRequest
	| ActionFailTimer
	| ActionSyncMoney
	| ActionSendTeamMoney
