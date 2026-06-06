import { InsaneInt } from './InsaneInt.js'
import type Client from './Client.js'
import type {
	ActionReadySkipBlind,
	BlindKind,
	BlindRow,
	LobbyType,
} from './actions.js'
import { DEFAULT_HANDS_PER_ROUND } from './constants.js'
import { isTeamLobbyType } from './lobbyTypes.js'

export const clearPendingBlindReadyState = (player: Client) => {
	player.isReady = false
	player.readyBlindRow = null
	player.readyBlindKind = null
	player.readyBlindHandsLeft = null
	player.readyBlindTarget = null
	player.skipReadyBlindRow = null
}

export const clearPlayerFirstReadyState = (player: Client) => {
	player.firstReady = false
}

export const markPlayerFirstReadyForBlind = (player: Client) => {
	player.firstReady = true
}

export const clearPlayerActiveBlindState = (player: Client) => {
	player.activeBlindStarted = false
}

export const clearPlayerCoopBlindState = (player: Client) => {
	player.coopBlindActive = false
}

export const clearPlayerStartedBlindRuntimeState = (player: Client) => {
	clearPlayerFirstReadyState(player)
	clearPlayerCoopBlindState(player)
	clearPlayerActiveBlindState(player)
}

export const clearPlayerReadyAndCoopBlindState = (player: Client) => {
	clearPendingBlindReadyState(player)
	clearPlayerCoopBlindState(player)
}

export const preparePlayerForMatchStart = (player: Client) => {
	player.isInMatch = true
	player.score = new InsaneInt(0, 0, 0)
	player.handsLeft = 0
	player.ante = 1
	player.skips = 0
	player.reportedMoney = 0
	player.furthestBlind = 0
	player.livesBlocker = false
	clearPendingBlindReadyState(player)
	clearPlayerStartedBlindRuntimeState(player)
	player.location = 'loc_selecting'
}

export const clearPlayerMatchParticipation = (player: Client) => {
	player.isInMatch = false
	player.livesBlocker = false
	clearPendingBlindReadyState(player)
	clearPlayerStartedBlindRuntimeState(player)
}

export const clearPlayerMatchRunStateForLobbyReturn = (
	player: Client,
) => {
	clearPlayerMatchParticipation(player)
	player.score = new InsaneInt(0, 0, 0)
	player.handsLeft = 0
	player.lives = 0
}

export const preparePlayerForFreshLobbyAttachment = (
	player: Client,
	options: { isOwner: boolean; lobbyType: LobbyType },
) => {
	clearPlayerMatchParticipation(player)
	player.score = new InsaneInt(0, 0, 0)
	player.handsLeft = DEFAULT_HANDS_PER_ROUND
	player.lives = 0
	player.ante = 1
	player.skips = 0
	player.furthestBlind = 0
	player.reportedMoney = 0
	player.location = 'loc_selecting'
	player.isOwner = options.isOwner
	player.isReadyLobby = false
	player.isTeamLocked = false
	player.team = isTeamLobbyType(options.lobbyType) ? 1 : null
}

export const clearPlayerLobbyMembership = (player: Client) => {
	clearPlayerMatchParticipation(player)
	player.lobby = null
	player.isOwner = false
	player.isReadyLobby = false
	player.isTeamLocked = false
	player.team = null
}

export const normalizeStartedBlindHandsLeft = (handsLeft: unknown) => {
	const value = Number(handsLeft)
	if (!Number.isFinite(value)) {
		return DEFAULT_HANDS_PER_ROUND
	}

	return Math.max(0, Math.floor(value))
}

export const markPlayerReadyForBlind = (
	player: Client,
	readyBlind: {
		row: BlindRow
		kind: BlindKind
		handsLeft?: unknown
		blindTarget?: string
	},
) => {
	player.isReady = true
	player.readyBlindRow = readyBlind.row
	player.readyBlindKind = readyBlind.kind
	player.readyBlindHandsLeft = normalizeStartedBlindHandsLeft(
		readyBlind.handsLeft,
	)
	player.readyBlindTarget = readyBlind.blindTarget ?? null
	player.skipReadyBlindRow = null
}

export const markPlayerReadyToSkipBlind = (
	player: Client,
	blindRow: ActionReadySkipBlind['blindRow'],
) => {
	clearPendingBlindReadyState(player)
	player.skipReadyBlindRow = blindRow
}

export const clearPlayerReadyToSkipBlind = (player: Client) => {
	player.skipReadyBlindRow = null
}

export const preparePlayerForStartedBlind = (
	player: Client,
	coopBlindActive = false,
	handsLeft: unknown = player.readyBlindHandsLeft,
) => {
	const startedBlindHandsLeft = normalizeStartedBlindHandsLeft(handsLeft)
	clearPendingBlindReadyState(player)
	player.score = new InsaneInt(0, 0, 0)
	player.handsLeft = startedBlindHandsLeft
	player.coopBlindActive = coopBlindActive
	player.activeBlindStarted = true
}

export const restorePlayerActiveCoopBlindState = (player: Client) => {
	clearPendingBlindReadyState(player)
	player.coopBlindActive = true
	player.activeBlindStarted = true
}
