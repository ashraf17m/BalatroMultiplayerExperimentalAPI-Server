import type { LobbyOptionsWirePayload } from './actionShared.js'

export type CoopSavePlayerWirePayload = {
	name: string
}

export type CoopSaveSummaryWirePayload = {
	saveId: string
	savedAt: number
	players: CoopSavePlayerWirePayload[]
	ante?: number
	blind?: string
	maxScore?: string
}

export type CoopSaveSnapshotWirePayload = {
	runData: string
	mpStateData: string
	score?: string
	handsLeft?: number
}

export type CoopSaveRecordWirePayload = CoopSaveSummaryWirePayload & {
	snapshots: Record<string, CoopSaveSnapshotWirePayload>
	options?: LobbyOptionsWirePayload
}

export type ActionSaveCoopRun = {
	action: 'saveCoopRun'
	cancel?: boolean
	runData?: string
	mpStateData?: string
	ante?: number
	blind?: string
	maxScore?: string
	score?: string
	handsLeft?: number
}
export type ActionResumeCoopSave = {
	action: 'resumeCoopSave'
	save: CoopSaveRecordWirePayload
}

export type ActionCoopSaveVote = {
	action: 'coopSaveVote'
	voters: number
	required: number
	committed: boolean
	saveId?: string
	save?: CoopSaveRecordWirePayload
}
export type ActionStartCoopSave = {
	action: 'startCoopSave'
	saveId: string
	runData: string
	mpStateData: string
	options?: LobbyOptionsWirePayload
}

export type ActionClientCoopSave =
	| ActionSaveCoopRun
	| ActionResumeCoopSave

export type ActionServerCoopSave =
	| ActionCoopSaveVote
	| ActionStartCoopSave
