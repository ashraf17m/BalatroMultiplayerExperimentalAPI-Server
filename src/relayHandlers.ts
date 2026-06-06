import type Client from './Client.js'
import type {
	ActionAsteroid,
	ActionEatPizza,
	ActionHandlerArgs,
	ActionLetsGoGamblingNemesis,
	ActionMagnetResponse,
	ActionRemovePhantom,
	ActionSendPhantom,
	ActionSoldJoker,
	ActionSpentLastShop,
} from './actions.js'
import { getEnemies } from './lobbyPlayerState/queries.js'
import { sendFeatureServerAction } from './protocol/v2/index.js'

type RelayedFeatureAction =
	| ActionSendPhantom
	| ActionRemovePhantom
	| ActionAsteroid
	| ActionLetsGoGamblingNemesis
	| ActionEatPizza
	| ActionSoldJoker
	| ActionSpentLastShop

const relayToEnemies = (
	client: Client,
	createAction: (playerId: string) => RelayedFeatureAction,
) => {
	const [, enemies] = getEnemies(client)

	for (const enemy of enemies) {
		sendFeatureServerAction(enemy, createAction(client.id))
	}
}

export const sendPhantomAction = (
	{ key }: ActionHandlerArgs<ActionSendPhantom>,
	client: Client,
) => {
	relayToEnemies(client, (playerId) => ({
		action: 'sendPhantom',
		key,
		playerId,
	}))
}

export const removePhantomAction = (
	{ key }: ActionHandlerArgs<ActionRemovePhantom>,
	client: Client,
) => {
	relayToEnemies(client, (playerId) => ({
		action: 'removePhantom',
		key,
		playerId,
	}))
}

export const asteroidAction = (client: Client) => {
	relayToEnemies(client, (playerId) => ({
		action: 'asteroid',
		playerId,
	}))
}

export const letsGoGamblingNemesisAction = (client: Client) => {
	relayToEnemies(client, (playerId) => ({
		action: 'letsGoGamblingNemesis',
		playerId,
	}))
}

export const eatPizzaAction = (
	{ whole }: ActionHandlerArgs<ActionEatPizza>,
	client: Client,
) => {
	relayToEnemies(client, (playerId) => ({
		action: 'eatPizza',
		whole,
		playerId,
	}))
}

export const soldJokerAction = (client: Client) => {
	relayToEnemies(client, (playerId) => ({
		action: 'soldJoker',
		playerId,
	}))
}

export const spentLastShopAction = (
	{ amount }: ActionHandlerArgs<ActionSpentLastShop>,
	client: Client,
) => {
	relayToEnemies(client, (playerId) => ({
		action: 'spentLastShop',
		amount,
		playerId,
	}))
}

export const magnetAction = (client: Client) => {
	const [, enemies] = getEnemies(client)

	if (enemies[0]) {
		sendFeatureServerAction(enemies[0], { action: 'magnet' })
	}
}

export const magnetResponseAction = (
	{ key }: ActionHandlerArgs<ActionMagnetResponse>,
	client: Client,
) => {
	const [, enemies] = getEnemies(client)

	for (const enemy of enemies) {
		sendFeatureServerAction(enemy, { action: 'magnetResponse', key })
	}
}
