import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionTeamCardSync,
	ActionTeamCardSyncRequest,
	ActionTeamHandLevelSync,
	ActionTeamHandLevelSyncRequest,
} from './actions.js'
import { sendSyncServerAction } from './protocol/v2/index.js'
import {
	getActiveClientSharedSyncContext,
	getClientSharedSyncReplayContext,
} from './sharedSyncGroups.js'

const sendTeamSyncToPeers = (
	peers: Client[],
	action: ActionTeamCardSync | ActionTeamHandLevelSync,
) => peers.forEach((peer) => sendSyncServerAction(peer, action))

const normalizeReportedHandLevel = (level: unknown) => {
	if (typeof level === 'string') {
		const normalizedLevel = level.trim()
		return normalizedLevel.length > 0 ? normalizedLevel : null
	}

	if (typeof level === 'number' && Number.isFinite(level)) {
		return String(Math.trunc(level))
	}

	return null
}

export const syncTeamDeckForClient = (client: Client) => {
	const context = getClientSharedSyncReplayContext(client, 'team_card_sync')
	if (!context) return

	const { lobby, groupId } = context
	const teamDeck = lobby.teamState.getDeck(groupId)

	if (!teamDeck || teamDeck.size === 0) return

	for (const [cardKey, cardData] of teamDeck.entries()) {
		sendSyncServerAction(client, {
			action: 'teamCardSync',
			playerId: 'SERVER',
			username: 'SERVER',
			cardKey,
			actionType: cardData ? 'sync' : 'removed',
			cardData: cardData ?? undefined,
		} satisfies ActionTeamCardSync)
	}
}

export const syncTeamHandLevelsForClient = (client: Client) => {
	const context = getClientSharedSyncReplayContext(client, 'team_hand_level_sync')
	if (!context) return

	const { lobby, groupId } = context
	const teamHandLevels = lobby.teamState.getHandLevels(groupId)

	if (!teamHandLevels || teamHandLevels.size === 0) return

	for (const [hand, level] of teamHandLevels.entries()) {
		sendSyncServerAction(client, {
			action: 'teamHandLevelSync',
			playerId: 'SERVER',
			username: 'SERVER',
			hand,
			level,
		} satisfies ActionTeamHandLevelSync)
	}
}

export const teamCardSyncAction = (
	args: ActionHandlerArgs<ActionTeamCardSyncRequest>,
	client: Client,
) => {
	const context = getActiveClientSharedSyncContext(client, 'team_card_sync')
	if (!context) return

	const { lobby, groupId, peers } = context
	const teamDeck = lobby.teamState.ensureDeck(groupId)

	if (args.actionType === 'removed') {
		teamDeck.set(args.cardKey, null)
	} else if (teamDeck.get(args.cardKey) === null) {
		return
	} else if (args.cardData) {
		teamDeck.set(args.cardKey, args.cardData)
	} else {
		return
	}

	sendTeamSyncToPeers(peers, {
		action: 'teamCardSync',
		playerId: client.id,
		username: client.username,
		cardKey: args.cardKey,
		actionType: args.actionType,
		cardData: args.cardData,
	})
}

export const teamHandLevelSyncAction = (
	args: ActionHandlerArgs<ActionTeamHandLevelSyncRequest>,
	client: Client,
) => {
	const context = getActiveClientSharedSyncContext(client, 'team_hand_level_sync')
	if (!context) return

	const hand = typeof args.hand === 'string' ? args.hand : ''
	const level = normalizeReportedHandLevel(args.level)
	if (!hand || level === null) {
		return
	}

	const { lobby, groupId, peers } = context
	const teamHandLevels = lobby.teamState.ensureHandLevels(groupId)

	const previousLevel = teamHandLevels.get(hand)
	if (previousLevel === level) {
		return
	}

	teamHandLevels.set(hand, level)

	sendTeamSyncToPeers(peers, {
		action: 'teamHandLevelSync',
		playerId: client.id,
		username: client.username,
		hand,
		level,
	})
}
