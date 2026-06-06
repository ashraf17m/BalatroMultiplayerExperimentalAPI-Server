export type ActionGetEndGameJokersResponse = {
	action: 'getEndGameJokers'
	targetPlayerId?: string
}
export type ActionReceiveEndGameJokersResponse = {
	action: 'receiveEndGameJokers'
	keys: string
	sourcePlayerId?: string
	requesterPlayerId?: string
}
export type ActionGetNemesisDeckResponse = {
	action: 'getNemesisDeck'
	targetPlayerId?: string
}
export type ActionReceiveNemesisDeckResponse = {
	action: 'receiveNemesisDeck'
	cards: string
	sourcePlayerId?: string
	requesterPlayerId?: string
}

export type ActionClientFeatureEndGame =
	| ActionGetEndGameJokersResponse
	| ActionReceiveEndGameJokersResponse
	| ActionGetNemesisDeckResponse
	| ActionReceiveNemesisDeckResponse
