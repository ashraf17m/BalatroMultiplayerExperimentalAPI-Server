import { COOP_SAVE_SERVER_ROUTES } from '../routeDescriptors/coopSave.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type CoopSaveProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof COOP_SAVE_SERVER_ROUTES>

export const sendCoopSaveServerAction: (
	client: ProtocolV2CapableClient,
	action: CoopSaveProtocolServerAction,
) => void = sendProtocolServerAction
