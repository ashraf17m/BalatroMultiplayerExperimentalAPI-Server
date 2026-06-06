export type ActionGetEndGameJokersRequest = {
	action: 'getEndGameJokers'
	requesterPlayerId?: string
}
export type ActionReceiveEndGameJokersRequest = {
	action: 'receiveEndGameJokers'
	keys: string
	sourcePlayerId?: string
	requesterPlayerId?: string
}
export type ActionGetNemesisDeckRequest = {
	action: 'getNemesisDeck'
	requesterPlayerId?: string
}
export type ActionReceiveNemesisDeckRequest = {
	action: 'receiveNemesisDeck'
	cards: string
	sourcePlayerId?: string
	requesterPlayerId?: string
}

export type ActionServerFeatureEndGame =
	| ActionGetEndGameJokersRequest
	| ActionReceiveEndGameJokersRequest
	| ActionGetNemesisDeckRequest
	| ActionReceiveNemesisDeckRequest
