import type { ActionClientFeatureEndGame } from './actionClientFeatureEndGame.js'
import type { ActionClientFeatureRelay } from './actionClientFeatureRelay.js'

export type {
	ActionGetEndGameJokersResponse,
	ActionGetNemesisDeckResponse,
	ActionReceiveEndGameJokersResponse,
	ActionReceiveNemesisDeckResponse,
	ActionClientFeatureEndGame,
} from './actionClientFeatureEndGame.js'

export type {
	ActionAsteroidRequest,
	ActionEatPizzaRequest,
	ActionLetsGoGamblingNemesisRequest,
	ActionMagnetRequest,
	ActionMagnetResponseRequest,
	ActionModdedRequest,
	ActionRemovePhantomRequest,
	ActionSendPhantomRequest,
	ActionSoldJokerRequest,
	ActionSpentLastShopRequest,
	ActionTeamCardSyncRequest,
	ActionTeamHandLevelSyncRequest,
	ActionClientFeatureRelay,
} from './actionClientFeatureRelay.js'

export type ActionClientFeature =
	| ActionClientFeatureRelay
	| ActionClientFeatureEndGame
