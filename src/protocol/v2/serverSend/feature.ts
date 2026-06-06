import { FEATURE_SERVER_ROUTES } from '../routeDescriptors/feature.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type FeatureProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof FEATURE_SERVER_ROUTES>

export const sendFeatureServerAction: (
	client: ProtocolV2CapableClient,
	action: FeatureProtocolServerAction,
) => void = sendProtocolServerAction
