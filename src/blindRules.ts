import type Lobby from './Lobby.js'
import type Client from './Client.js'
import type { BlindKind, BlindRow } from './actions.js'
import {
	getLobbyActivePlayers,
	getLobbyActiveTeamPlayers,
} from './lobbyPlayerState/queries.js'
import {
	isCoopLobbyType,
	isDuelsLobbyType,
	isTeamLobbyType,
} from './lobbyTypes.js'

const VALID_BLIND_ROWS: BlindRow[] = ['Small', 'Big', 'Boss']
const VALID_BLIND_KINDS: BlindKind[] = ['small', 'big', 'boss', 'pvp']
const VALID_BLIND_KINDS_BY_ROW: Record<BlindRow, BlindKind[]> = {
	Small: ['small', 'pvp'],
	Big: ['big', 'pvp'],
	Boss: ['boss', 'pvp'],
}

export const isBlindRow = (value: unknown): value is BlindRow =>
	typeof value === 'string' && VALID_BLIND_ROWS.includes(value as BlindRow)

export const isSkipBlindRow = (
	value: unknown,
): value is Extract<BlindRow, 'Small' | 'Big'> =>
	value === 'Small' || value === 'Big'

export const isBlindKind = (value: unknown): value is BlindKind =>
	typeof value === 'string' && VALID_BLIND_KINDS.includes(value as BlindKind)

export const normalizeBlindRow = (value: unknown): BlindRow | null => {
	return isBlindRow(value) ? value : null
}

export const normalizeBlindKind = (value: unknown): BlindKind | null => {
	return isBlindKind(value) ? value : null
}

export const isBlindKindValidForRow = (
	blindRow: BlindRow,
	blindKind: BlindKind,
) => {
	return VALID_BLIND_KINDS_BY_ROW[blindRow].includes(blindKind)
}

export const isPlayerReadyForPvpBlind = (
	player: Pick<Client, 'isReady' | 'readyBlindKind' | 'readyBlindRow'>,
) =>
	player.isReady &&
	player.readyBlindKind === 'pvp' &&
	player.readyBlindRow != null

export const hasDisconnectedMatchBlocker = (lobby: Lobby): boolean => {
	return lobby.getDisconnectedSlots().some(
		(slot) => slot.savedState.isInMatch === true,
	)
}

export const hasDisconnectedTeamBlindBlocker = (
	lobby: Lobby,
	teamId: number,
): boolean => {
	return lobby.getDisconnectedSlots().some(
		(slot) =>
			slot.savedState.isInMatch === true &&
			(slot.savedState.team ?? 1) === teamId,
	)
}

const isGlobalBlindKind = (lobby: Lobby): boolean => {
	return isCoopLobbyType(lobby.lobbyType) || !isTeamLobbyType(lobby.lobbyType)
}

const getRequiredBlindReadyPlayers = (
	lobby: Lobby,
	client: Client,
	blindKind: BlindKind,
) => {
	if (isGlobalBlindKind(lobby) || blindKind === 'pvp') {
		return getLobbyActivePlayers(lobby)
	}

	return getLobbyActiveTeamPlayers(lobby, client.team ?? 1)
}

export const blindReadySatisfied = (
	lobby: Lobby,
	client: Client,
	blindRow: BlindRow,
	blindKind: BlindKind,
): boolean => {
	const requiredPlayers = getRequiredBlindReadyPlayers(lobby, client, blindKind)
	if (requiredPlayers.length === 0) {
		return false
	}

	if (isDuelsLobbyType(lobby.lobbyType)) {
		return requiredPlayers.every((player) => {
			if (!player.isReady || player.readyBlindRow !== blindRow) {
				return false
			}

			const isBye = lobby.duelState.isBye(player.id)
			return isBye
				? player.readyBlindKind !== 'pvp'
				: player.readyBlindKind === 'pvp'
		})
	}

	return requiredPlayers.every(
		(player) =>
			player.isReady &&
			player.readyBlindRow === blindRow &&
			player.readyBlindKind === blindKind,
	)
}
