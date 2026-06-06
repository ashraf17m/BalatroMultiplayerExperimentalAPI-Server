import { TEAM_SERVER_ROUTES } from '../routeDescriptors/team.js'
import {
	type ProtocolServerActionForRouteSpecs,
	type ProtocolV2CapableClient,
	sendProtocolServerAction,
} from './shared.js'

export type TeamProtocolServerAction =
	ProtocolServerActionForRouteSpecs<typeof TEAM_SERVER_ROUTES>

export const sendTeamServerAction: (
	client: ProtocolV2CapableClient,
	action: TeamProtocolServerAction,
) => void = sendProtocolServerAction
