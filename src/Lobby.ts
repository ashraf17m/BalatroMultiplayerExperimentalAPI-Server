import type Client from './Client.js'
import type { GameMode, LobbyType } from './actions.js'
import { LobbyAnteTimerState } from './lobbyAnteTimer.js'
import { LobbyDuelState } from './lobbyDuelState.js'
import type { DisconnectedSlot } from './lobbyReconnect/shared.js'
import { allocateLobbyCode, registerLobby } from './lobbyRegistry.js'
import { LobbyTeamState } from './lobbyTeamState.js'
import { DEFAULT_GAME_MODE } from './gameModes.js'
import {
	type LobbyOptions,
	getDefaultLobbyOptions,
} from './lobbyOptions.js'
import { DEFAULT_LOBBY_TYPE } from './lobbyTypes.js'
import { preparePlayerForFreshLobbyAttachment } from './playerState.js'

type AttachFreshClientOptions = {
	isOwner?: boolean
}

type EndGameSnapshot = {
	jokers?: string
	deck?: string
}

class Lobby {
	code: string
	gameMode: GameMode
	lobbyType: LobbyType
	options: LobbyOptions
	isInGame = false
	coopSaveId: string | null = null
	ownerId: string
	firstReadyAt: number | null = null
	/** Shared team-sync and cooperative blind runtime state */
	teamState = new LobbyTeamState()
	/** Active Duels pairings, byes, and bye blind targets */
	duelState = new LobbyDuelState()
	/** Shared ante timer state for the active match */
	anteTimer = new LobbyAnteTimerState()
	/** Connected lobby players */
	private players = new Map<string, Client>()
	/** Tracks disconnected players awaiting reconnection */
	private disconnectedSlots = new Map<string, DisconnectedSlot>()
	private endGameSnapshots = new Map<string, EndGameSnapshot>()

	// Attrition is the default game mode, FFA is the default lobby type
	constructor(
		host: Client,
		gameMode: GameMode = DEFAULT_GAME_MODE,
		lobbyType: LobbyType = DEFAULT_LOBBY_TYPE,
	) {
		this.code = allocateLobbyCode()
		registerLobby(this)

		this.ownerId = host.id
		this.gameMode = gameMode
		this.lobbyType = lobbyType
		this.options = getDefaultLobbyOptions(lobbyType)
		this.attachFreshClient(host, { isOwner: true })
	}

	getClientGamemodeKey = () => `gamemode_mp_${this.gameMode}`

	setOption = (key: string, value: string | number | boolean) => {
		this.options[key] = value
		return value
	}

	getPlayerMap = (): ReadonlyMap<string, Client> => this.players

	getPlayers = (): Client[] => Array.from(this.players.values())

	getPlayerCount = (): number => this.players.size

	getFirstPlayer = (): Client | undefined =>
		this.players.values().next().value

	hasPlayer = (playerId: string): boolean => this.players.has(playerId)

	getPlayer = (playerId: string): Client | undefined =>
		this.players.get(playerId)

	addPlayer = (player: Client): Client => {
		this.players.set(player.id, player)
		return player
	}

	removePlayer = (playerId: string): boolean => this.players.delete(playerId)

	setOwner = (playerId: string): boolean => {
		const newOwner = this.getPlayer(playerId)
		if (!newOwner) {
			return false
		}

		this.ownerId = playerId
		for (const player of this.getPlayers()) {
			player.isOwner = player.id === newOwner.id
		}
		return true
	}

	attachFreshClient = (
		client: Client,
		options: AttachFreshClientOptions = {},
	) => {
		const { isOwner = false } = options
		preparePlayerForFreshLobbyAttachment(client, {
			isOwner,
			lobbyType: this.lobbyType,
		})
		this.addPlayer(client)
		client.lobby = this
	}

	clearEndGameSnapshots = () => {
		this.endGameSnapshots.clear()
	}

	getEndGameSnapshot = (playerId: string): EndGameSnapshot | undefined => {
		return this.endGameSnapshots.get(playerId)
	}

	storeEndGameSnapshot = (
		playerId: string,
		snapshot: EndGameSnapshot,
	): EndGameSnapshot => {
		const existingSnapshot = this.endGameSnapshots.get(playerId) ?? {}
		const nextSnapshot = { ...existingSnapshot, ...snapshot }
		this.endGameSnapshots.set(playerId, nextSnapshot)
		return nextSnapshot
	}

	getDisconnectedSlot = (playerId: string): DisconnectedSlot | undefined =>
		this.disconnectedSlots.get(playerId)

	setDisconnectedSlot = (
		playerId: string,
		slot: DisconnectedSlot,
	): DisconnectedSlot => {
		this.disconnectedSlots.set(playerId, slot)
		return slot
	}

	deleteDisconnectedSlot = (playerId: string): boolean =>
		this.disconnectedSlots.delete(playerId)

	findDisconnectedSlot = (
		predicate: (slot: DisconnectedSlot) => boolean,
	): DisconnectedSlot | undefined => {
		for (const slot of this.disconnectedSlots.values()) {
			if (predicate(slot)) {
				return slot
			}
		}
		return undefined
	}

	getDisconnectedSlots = (): DisconnectedSlot[] =>
		Array.from(this.disconnectedSlots.values())
}

export default Lobby
