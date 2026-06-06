import type { ActionServerToClient } from '../../actions.js'
import {
	isUtilityServerAction,
	sendProtocolV2EnvelopeOrUtilityAction,
} from './serverEnvelope.js'
export {
	type CoopSaveProtocolServerAction,
	sendCoopSaveServerAction,
} from './serverSend/coopSave.js'
export {
	type EndgameProtocolServerAction,
	sendEndgameServerAction,
} from './serverSend/endgame.js'
export {
	type FeatureProtocolServerAction,
	sendFeatureServerAction,
} from './serverSend/feature.js'
export {
	type LobbyProtocolServerAction,
	sendLobbyServerAction,
} from './serverSend/lobby.js'
export {
	type MatchProtocolServerAction,
	sendMatchServerAction,
} from './serverSend/match.js'
import { type ProtocolV2CapableClient } from './serverSend/shared.js'
export {
	sendSystemConnected,
	sendSystemError,
	sendSystemRequestVersion,
} from './serverSend/system.js'
export {
	type SyncProtocolServerAction,
	sendSyncServerAction,
} from './serverSend/sync.js'
export {
	type TeamProtocolServerAction,
	sendTeamServerAction,
} from './serverSend/team.js'
import {
	type LegacyOnlyServerAction,
	sendUtilityServerAction,
} from './serverSend/utility.js'
export { type LegacyOnlyServerAction, sendUtilityServerAction }

export const sendServerAction = (
	client: ProtocolV2CapableClient,
	action: ActionServerToClient | LegacyOnlyServerAction,
) => {
	if (isUtilityServerAction(action.action)) {
		sendUtilityServerAction(client, action as LegacyOnlyServerAction)
		return
	}

	sendProtocolV2EnvelopeOrUtilityAction(client, action as ActionServerToClient)
}
