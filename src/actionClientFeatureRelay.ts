export type ActionSendPhantomRequest = {
	action: 'sendPhantom'
	key: string
	playerId?: string
}
export type ActionRemovePhantomRequest = {
	action: 'removePhantom'
	key: string
	playerId?: string
}
export type ActionAsteroidRequest = { action: 'asteroid' }
export type ActionLetsGoGamblingNemesisRequest = {
	action: 'letsGoGamblingNemesis'
}
export type ActionEatPizzaRequest = { action: 'eatPizza'; whole: number }
export type ActionSoldJokerRequest = { action: 'soldJoker' }
export type ActionSpentLastShopRequest = {
	action: 'spentLastShop'
	amount: number
}
export type ActionMagnetRequest = { action: 'magnet' }
export type ActionMagnetResponseRequest = {
	action: 'magnetResponse'
	key: string
}
export type ActionModdedRequest = {
	action: 'moddedAction'
	modId: string
	modAction: string
	target?: 'nemesis' | 'all'
	[key: string]: unknown
}
export type ActionTeamCardSyncRequest = {
	action: 'teamCardSync'
	cardKey: string
	actionType: 'sync' | 'removed'
	cardData?: string
}
export type ActionTeamHandLevelSyncRequest = {
	action: 'teamHandLevelSync'
	hand: string
	level: string
}

export type ActionClientFeatureRelay =
	| ActionSendPhantomRequest
	| ActionRemovePhantomRequest
	| ActionAsteroidRequest
	| ActionLetsGoGamblingNemesisRequest
	| ActionEatPizzaRequest
	| ActionSoldJokerRequest
	| ActionSpentLastShopRequest
	| ActionMagnetRequest
	| ActionMagnetResponseRequest
	| ActionModdedRequest
	| ActionTeamCardSyncRequest
	| ActionTeamHandLevelSyncRequest
