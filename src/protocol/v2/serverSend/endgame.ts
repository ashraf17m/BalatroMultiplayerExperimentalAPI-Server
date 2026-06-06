import { ENDGAME_SERVER_ROUTES } from '../routeDescriptors/endgame.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type EndgameProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof ENDGAME_SERVER_ROUTES>

export const sendEndgameServerAction: (
	client: ProtocolV2CapableClient,
	action: EndgameProtocolServerAction,
) => void = sendProtocolServerAction
