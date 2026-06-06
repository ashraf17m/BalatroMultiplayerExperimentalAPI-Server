import type { ActionServerFeatureEndGame } from './actionServerFeatureEndGame.js'
import type { ActionServerFeatureRelay } from './actionServerFeatureRelay.js'
import type { AdminOverlayServerAction } from './admin/adminOverlayActions.js'

export type {
	ActionGetEndGameJokersRequest,
	ActionGetNemesisDeckRequest,
	ActionReceiveEndGameJokersRequest,
	ActionReceiveNemesisDeckRequest,
	ActionServerFeatureEndGame,
} from './actionServerFeatureEndGame.js'

export type {
	ActionAsteroid,
	ActionEatPizza,
	ActionLetsGoGamblingNemesis,
	ActionMagnet,
	ActionMagnetResponse,
	ActionModded,
	ActionRemovePhantom,
	ActionSendPhantom,
	ActionSoldJoker,
	ActionSpentLastShop,
	ActionTeamCardSync,
	ActionTeamHandLevelSync,
	ActionServerFeatureRelay,
} from './actionServerFeatureRelay.js'

export type {
	ActionJimboAppear,
	ActionJimboMove,
	ActionJimboRemove,
	ActionJimboTalk,
	AdminOverlayServerAction,
} from './admin/adminOverlayActions.js'

export type ActionServerFeature =
	| ActionServerFeatureRelay
	| ActionServerFeatureEndGame
	| AdminOverlayServerAction
