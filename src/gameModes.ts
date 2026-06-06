import type { GameMode } from './actions.js'

export const DEFAULT_GAME_MODE: GameMode = 'attrition'

export const STARTING_LIVES_BY_GAME_MODE: Record<GameMode, number> = {
	attrition: 4,
	showdown: 2,
	survival: 1,
	coop: 1,
}

export const isValidGameMode = (value: string): value is GameMode =>
	Object.prototype.hasOwnProperty.call(STARTING_LIVES_BY_GAME_MODE, value)
