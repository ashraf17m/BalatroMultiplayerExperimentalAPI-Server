import { randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { v4 as uuidv4 } from 'uuid'
import { InsaneInt } from './InsaneInt.js'
import type Lobby from './Lobby.js'
import type { ActionServerToClient, BlindKind, BlindRow } from './actions.js'
import { DEFAULT_HANDS_PER_ROUND } from './constants.js'
import type { ProtocolV2Envelope } from './protocol/v2/index.js'

type ClientAddress = AddressInfo | Record<string, never>
type SendFn = (action: ActionServerToClient) => void
type SendProtocolV2Fn = (envelope: ProtocolV2Envelope) => void

class Client {
	id: string = uuidv4()
	address: ClientAddress
	sendAction: SendFn
	sendProtocolV2: SendProtocolV2Fn
	reconnectToken = randomBytes(16).toString('hex')
	isCached = true
	username = 'Guest'
	blindCol = 1
	nemesisPlayerId: string | null = null
	modHash = 'NULL'
	lobby: Lobby | null = null
	isReadyLobby = false
	team: number | null = null
	isTeamLocked = false
	isOwner = false
	isReady = false
	firstReady = false
	coopBlindActive = false
	skipReadyBlindRow: 'Small' | 'Big' | null = null
	readyBlindRow: BlindRow | null = null
	readyBlindKind: BlindKind | null = null
	readyBlindHandsLeft: number | null = null
	readyBlindTarget: string | null = null
	activeBlindStarted = false
	lives = 0
	score: InsaneInt = new InsaneInt(0, 0, 0)
	handsLeft = DEFAULT_HANDS_PER_ROUND
	ante = 1
	skips = 0
	furthestBlind = 0
	reportedMoney = 0
	livesBlocker = false
	location = 'loc_selecting'
	isInMatch = false

	constructor(
		address: ClientAddress,
		send: SendFn,
		sendProtocolV2: SendProtocolV2Fn,
	) {
		this.address = address
		this.sendAction = send
		this.sendProtocolV2 = sendProtocolV2
	}
}

export default Client
