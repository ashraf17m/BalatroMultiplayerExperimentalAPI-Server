import type Lobby from './Lobby.js'
import type { GameMode, LobbyOptionsWirePayload } from './actions.js'
import { MAX_GROUP_LOBBY_PLAYERS } from './constants.js'
import { isValidGameMode } from './gameModes.js'
import {
	broadcastLobbyAction,
	broadcastLobbyTypeChanged,
} from './lobbyBroadcasts.js'
import {
	getDefaultLobbyOptions,
	getDefaultCustomWinnerCount,
	getCustomWinnerLimit,
	getLobbyTypeLockedOptions,
	normalizeLobbyOptionString,
	normalizeLobbyOptionValue,
} from './lobbyOptions.js'
import { refreshLobbyNemesisAssignmentsForLobby } from './lobbyNemesis.js'
import { getMinimumGroupMaxPlayers } from './lobbyRules.js'
import { getLobbyTypeForGameMode } from './lobbyTypes.js'
import { resetLobbyPlayersForLobbyTypeChange } from './lobbyTypeState.js'

const applyDerivedGameModeConstraints = (
	lobby: Lobby,
	normalizedOptions: { [key: string]: string | number | boolean },
	previousGameMode: GameMode,
) => {
	const gameModeChanged = previousGameMode !== lobby.gameMode
	const currentModeForcesLivesHudOff = lobby.gameMode === 'coop'
	const previousModeForcedLivesHudOff = previousGameMode === 'coop'
	const optionWasSent = (key: string) =>
		Object.prototype.hasOwnProperty.call(normalizedOptions, key)
	const resetToDefault = (key: string) => {
		const defaultValue = getDefaultLobbyOptions(lobby.lobbyType)[key]
		if (defaultValue === undefined) return
		lobby.setOption(key, defaultValue)
		normalizedOptions[key] = defaultValue
	}

	if (currentModeForcesLivesHudOff) {
		lobby.setOption('starting_lives', 1)
		lobby.setOption('disable_live_and_timer_hud', true)
		normalizedOptions.starting_lives = 1
		normalizedOptions.disable_live_and_timer_hud = true
	} else if (
		lobby.gameMode === 'survival' &&
		gameModeChanged &&
		!optionWasSent('starting_lives')
	) {
		lobby.setOption('starting_lives', 1)
		normalizedOptions.starting_lives = 1
	} else if (gameModeChanged && previousModeForcedLivesHudOff) {
		if (!optionWasSent('starting_lives')) {
			resetToDefault('starting_lives')
		}
		if (!optionWasSent('disable_live_and_timer_hud')) {
			resetToDefault('disable_live_and_timer_hud')
		}
	}

	if (lobby.gameMode === 'coop') {
		lobby.setOption('timer', false)
		normalizedOptions.timer = false
	} else if (gameModeChanged && previousGameMode === 'coop') {
		if (!optionWasSent('timer')) {
			resetToDefault('timer')
		}
	}
}

const applyDerivedLobbyTypeConstraints = (
	lobby: Lobby,
	normalizedOptions: { [key: string]: string | number | boolean },
) => {
	for (const [key, value] of Object.entries(
		getLobbyTypeLockedOptions(lobby.lobbyType),
	)) {
		if (value === undefined) continue
		lobby.setOption(key, value)
		normalizedOptions[key] = value
	}
}

const hasNormalizedOption = (
	options: { [key: string]: string | number | boolean },
	key: string,
) => Object.prototype.hasOwnProperty.call(options, key)

const normalizePositiveInteger = (
	value: string | number | boolean | undefined,
	fallback: number,
) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback
	}
	return Math.max(1, Math.trunc(value))
}

const getConfiguredMaxPlayers = (lobby: Lobby) =>
	normalizePositiveInteger(
		lobby.options.max_players,
		MAX_GROUP_LOBBY_PLAYERS,
	)

const getConfiguredCustomWinners = (lobby: Lobby) => {
	const configured = Number(lobby.options.pvp_custom_winners)
	return Number.isFinite(configured) ? Math.max(1, Math.trunc(configured)) : null
}

const clampCustomWinners = (winnerCount: number, maxPlayers: number) =>
	Math.max(
		1,
		Math.min(getCustomWinnerLimit(maxPlayers), Math.trunc(winnerCount)),
	)

const setDerivedCustomWinners = (
	lobby: Lobby,
	normalizedOptions: { [key: string]: string | number | boolean },
	value: number,
) => {
	lobby.setOption('pvp_custom_winners', value)
	normalizedOptions.pvp_custom_winners = value
}

const applyDerivedCustomWinnerOptions = (
	lobby: Lobby,
	normalizedOptions: { [key: string]: string | number | boolean },
	previousMaxPlayers: number,
	previousCustomWinners: number | null,
) => {
	const maxPlayers = getConfiguredMaxPlayers(lobby)
	const customWinnersSent = hasNormalizedOption(
		normalizedOptions,
		'pvp_custom_winners',
	)

	if (customWinnersSent) {
		const rawWinnerCount = normalizePositiveInteger(
			normalizedOptions.pvp_custom_winners,
			getDefaultCustomWinnerCount(maxPlayers),
		)
		setDerivedCustomWinners(
			lobby,
			normalizedOptions,
			clampCustomWinners(rawWinnerCount, maxPlayers),
		)
		return
	}

	const currentCustomWinners = getConfiguredCustomWinners(lobby)
	const previousDefaultWinners = getDefaultCustomWinnerCount(previousMaxPlayers)
	const shouldFollowDefault =
		currentCustomWinners === null ||
		previousCustomWinners === null ||
		previousCustomWinners === previousDefaultWinners
	const maxPlayersChanged =
		hasNormalizedOption(normalizedOptions, 'max_players') &&
		maxPlayers !== previousMaxPlayers

	if (maxPlayersChanged && shouldFollowDefault) {
		setDerivedCustomWinners(
			lobby,
			normalizedOptions,
			getDefaultCustomWinnerCount(maxPlayers),
		)
		return
	}

	if (
		currentCustomWinners === null ||
		currentCustomWinners > getCustomWinnerLimit(maxPlayers)
	) {
		setDerivedCustomWinners(
			lobby,
			normalizedOptions,
			clampCustomWinners(
				currentCustomWinners ?? getDefaultCustomWinnerCount(maxPlayers),
				maxPlayers,
			),
		)
	}
}

export const applyLobbyOptions = (
	lobby: Lobby,
	options: LobbyOptionsWirePayload,
	shouldBroadcast = true,
) => {
	const normalizedOptions: { [key: string]: string | number | boolean } = {}
	const previousGameMode = lobby.gameMode
	const previousLobbyType = lobby.lobbyType
	const previousMaxPlayers = getConfiguredMaxPlayers(lobby)
	const previousCustomWinners = getConfiguredCustomWinners(lobby)

	for (const [key, value] of Object.entries(options)) {
		if (key === 'gamemode') {
			const rawGamemode = normalizeLobbyOptionString(value) ?? ''
			const normalizedGameMode = rawGamemode.replace(/^gamemode_mp_/, '')
			if (isValidGameMode(normalizedGameMode)) {
				lobby.gameMode = normalizedGameMode
				normalizedOptions[key] = lobby.getClientGamemodeKey()
			}
			continue
		}

		const normalizedValue = normalizeLobbyOptionValue(key, value)
		if (normalizedValue === undefined) {
			continue
		}

		const finalValue =
			key === 'max_players' && typeof normalizedValue === 'number'
				? Math.max(
						getMinimumGroupMaxPlayers(lobby),
						Math.min(MAX_GROUP_LOBBY_PLAYERS, normalizedValue),
				  )
				: normalizedValue

		lobby.setOption(key, finalValue)
		normalizedOptions[key] = finalValue
	}

	applyDerivedCustomWinnerOptions(
		lobby,
		normalizedOptions,
		previousMaxPlayers,
		previousCustomWinners,
	)
	applyDerivedGameModeConstraints(lobby, normalizedOptions, previousGameMode)

	const resolvedLobbyType = getLobbyTypeForGameMode(
		lobby.gameMode,
		lobby.lobbyType,
	)
	if (resolvedLobbyType !== lobby.lobbyType) {
		lobby.lobbyType = resolvedLobbyType
		resetLobbyPlayersForLobbyTypeChange(lobby)
		refreshLobbyNemesisAssignmentsForLobby(lobby)
	}
	const lobbyTypeChanged = previousLobbyType !== lobby.lobbyType
	applyDerivedLobbyTypeConstraints(lobby, normalizedOptions)

	if (shouldBroadcast) {
		broadcastLobbyAction(lobby, {
			action: 'lobbyOptions',
			options: normalizedOptions,
		})

		if (lobbyTypeChanged) {
			broadcastLobbyTypeChanged(lobby)
		}
	}
}
