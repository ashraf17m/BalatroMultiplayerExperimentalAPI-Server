export type ActionJimboAppear = {
	action: 'jimboAppear'
	pos: number
	text?: string
}

export type ActionJimboTalk = { action: 'jimboTalk'; text: string }
export type ActionJimboMove = { action: 'jimboMove'; pos: number }
export type ActionJimboRemove = { action: 'jimboRemove' }

export type AdminOverlayServerAction =
	| ActionJimboAppear
	| ActionJimboTalk
	| ActionJimboMove
	| ActionJimboRemove
