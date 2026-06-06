import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionSendTeamMoney,
	ActionSyncMoney,
} from './actions.js'
import { sendSystemError, sendTeamServerAction } from './protocol/v2/index.js'
import { traceRuntimeEvent } from './runtimeTrace.js'
import {
	clientsShareSyncGroup,
	isSharedSyncOptionEnabled,
	lobbyUsesSharedSyncGroup,
} from './sharedSyncGroups.js'

const normalizeMoney = (money: number) =>
	Number.isFinite(money) ? Math.floor(money) : 0

const isWholeDollarAmount = (money: number) =>
	Number.isFinite(money) && money >= 1 && Math.floor(money) === money

type TeamMoneyBlockedTraceFields = {
	lobbyCode?: string
	targetPlayerId?: string
	amount?: number
	reportedMoney?: number
}

const traceTeamMoneySendBlocked = (
	client: Client,
	reason: string,
	fields: TeamMoneyBlockedTraceFields,
) => {
	traceRuntimeEvent('team_money.send_blocked', {
		clientId: client.id,
		reason,
		...fields,
	})
}

const rejectTeamMoneySend = (
	client: Client,
	message: string,
	reason: string,
	fields: TeamMoneyBlockedTraceFields,
) => {
	traceTeamMoneySendBlocked(client, reason, fields)
	sendSystemError(client, message)
}

export const syncMoneyAction = (
	{ money }: ActionHandlerArgs<ActionSyncMoney>,
	client: Client,
) => {
	if (
		lobbyUsesSharedSyncGroup(client.lobby) &&
		!isSharedSyncOptionEnabled(client.lobby, 'team_money_sync')
	) {
		return
	}

	client.reportedMoney = normalizeMoney(Number(money))
	traceRuntimeEvent('team_money.sync', {
		clientId: client.id,
		money: client.reportedMoney,
	})
}

export const sendTeamMoneyAction = (
	{ targetPlayerId, amount, money }: ActionHandlerArgs<ActionSendTeamMoney>,
	client: Client,
) => {
	const lobby = client.lobby
	if (!lobby) {
		traceTeamMoneySendBlocked(client, 'no_lobby', { targetPlayerId, amount })
		return
	}

	const traceFields = { lobbyCode: lobby.code, targetPlayerId, amount }
	const rejectSend = (
		message: string,
		reason: string,
		fields: TeamMoneyBlockedTraceFields = traceFields,
	) => rejectTeamMoneySend(client, message, reason, fields)

	if (!lobbyUsesSharedSyncGroup(lobby)) {
		return rejectSend(
			'Money sharing is only available in teams or co-op lobbies.',
			'not_shared_sync_group',
		)
	}

	if (!isSharedSyncOptionEnabled(lobby, 'team_money_sync')) {
		return rejectSend(
			'Money sharing is disabled for this lobby.',
			'disabled',
		)
	}

	if (!lobby.isInGame) {
		return rejectSend(
			'Money sharing is only available during a run.',
			'not_in_game',
		)
	}

	if (!client.isInMatch) {
		return rejectSend('You are not in the current match.', 'sender_not_in_match')
	}

	const target = lobby.getPlayer(targetPlayerId)
	if (!target) {
		return rejectSend('Teammate not found.', 'target_not_found')
	}

	if (!target.isInMatch) {
		return rejectSend(
			'That teammate is not in the current match.',
			'target_not_in_match',
		)
	}

	if (target.id === client.id) {
		return rejectSend('You cannot send money to yourself.', 'self_target')
	}

	if (!clientsShareSyncGroup(lobby, client, target)) {
		return rejectSend(
			'You can only send money to teammates.',
			'different_sync_group',
		)
	}

	const reportedSenderMoney = normalizeMoney(Number(money))
	client.reportedMoney = reportedSenderMoney

	const transferAmount = Number(amount)
	if (!isWholeDollarAmount(transferAmount)) {
		return rejectSend(
			'Transfers must be whole-dollar amounts of at least $1.',
			'invalid_amount',
			{ ...traceFields, reportedMoney: reportedSenderMoney },
		)
	}

	if (reportedSenderMoney < transferAmount) {
		return rejectSend(
			'You do not have enough money to send.',
			'reported_money_below_amount',
			{
				...traceFields,
				amount: transferAmount,
				reportedMoney: reportedSenderMoney,
			},
		)
	}

	client.reportedMoney = reportedSenderMoney - transferAmount
	target.reportedMoney = normalizeMoney(target.reportedMoney) + transferAmount
	traceRuntimeEvent('team_money.send_applied', {
		clientId: client.id,
		targetPlayerId: target.id,
		lobbyCode: lobby.code,
		amount: transferAmount,
		reportedSenderMoney,
		senderMoneyAfterTransfer: client.reportedMoney,
		targetMoneyAfterTransfer: target.reportedMoney,
	})

	sendTeamServerAction(client, {
		action: 'moneyUpdate',
		delta: -transferAmount,
		sourcePlayerId: target.id,
	})

	sendTeamServerAction(target, {
		action: 'moneyUpdate',
		delta: transferAmount,
		sourcePlayerId: client.id,
	})
}
