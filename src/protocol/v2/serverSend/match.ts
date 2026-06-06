import { MATCH_SERVER_ROUTES } from '../routeDescriptors/match.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type MatchProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof MATCH_SERVER_ROUTES>

export const sendMatchServerAction: (
	client: ProtocolV2CapableClient,
	action: MatchProtocolServerAction,
) => void = sendProtocolServerAction
