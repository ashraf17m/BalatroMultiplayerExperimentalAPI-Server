import { SYNC_ROUTES } from '../routeDescriptors/sync.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type SyncProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof SYNC_ROUTES>

export const sendSyncServerAction: (
	client: ProtocolV2CapableClient,
	action: SyncProtocolServerAction,
) => void = sendProtocolServerAction
