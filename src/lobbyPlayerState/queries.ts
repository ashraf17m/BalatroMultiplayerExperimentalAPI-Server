import type Lobby from '../Lobby.js'
import type Client from '../Client.js'

export const getLobbyActivePlayers = (lobby: Lobby): Client[] => {
	return lobby.getPlayers().filter((player) => player.isInMatch)
}

export const getEnemies = (
	client: Client,
): [Lobby | null, Client[]] => {
	const lobby = client.lobby
	if (!lobby) return [null, []]

	const players =
		lobby.isInGame && client.isInMatch
			? getLobbyActivePlayers(lobby)
			: lobby.isInGame
			  ? []
			  : lobby.getPlayers()
	const enemies = players.filter((player) => player.id !== client.id)
	return [lobby, enemies]
}

export const isPlayerExcludedFromActiveMatch = (
	lobby: Lobby,
	player: Pick<Client, 'isInMatch'>,
) => lobby.isInGame && !player.isInMatch

export const getLobbyActiveTeamPlayers = (
	lobby: Lobby,
	teamId: number,
): Client[] => {
	return getLobbyActivePlayers(lobby).filter(
		(player) => (player.team ?? 1) === teamId,
	)
}

export const getLobbyTeamLives = (lobby: Lobby, teamId: number): number => {
	return lobby.teamState.getLives(teamId)
}
