import { LOBBY_SERVER_ROUTES } from '../routeDescriptors/lobby.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type LobbyProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof LOBBY_SERVER_ROUTES>

export const sendLobbyServerAction: (
	client: ProtocolV2CapableClient,
	action: LobbyProtocolServerAction,
) => void = sendProtocolServerAction
