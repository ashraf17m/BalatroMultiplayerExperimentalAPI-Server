import { createServer } from 'node:net'
import { startAdminServer } from './admin/adminServer.js'
import { disconnectFromLobbyAction } from './lobbyModerationHandlers.js'
import {
	sendSystemConnected,
	sendSystemRequestVersion,
} from './protocol/v2/index.js'
import {
	getServerLogPath,
	isServerLogEnabled,
	traceServerEvent,
} from './runtimeTrace.js'
import { isLoopbackHost, resolveServerConfig } from './serverConfig.js'
import { createSocketConnectionHandler } from './socket/socketConnection.js'
import { handleIncomingSocketMessage } from './socket/socketDispatch.js'

const {
	adminPort,
	explicitGameplayPort,
	gameplayPort,
	genericPort,
	host,
	isRailwayDeployment,
	railwayApplicationPort,
	railwayTcpProxyDomain,
	railwayTcpProxyPort,
} = resolveServerConfig(process.env)

interface BigIntWithToJSON {
	prototype: {
		toJSON: () => string
	}
}
;(BigInt as unknown as BigIntWithToJSON).prototype.toJSON = function () {
	return this.toString()
}

const handleGameplaySocketConnection = createSocketConnectionHandler({
	onConnected: (client) => {
		sendSystemConnected(client)
		sendSystemRequestVersion(client)
	},
	onDisconnected: (client) => {
		disconnectFromLobbyAction(client)
	},
	onMessage: handleIncomingSocketMessage,
})

const server = createServer(handleGameplaySocketConnection)

server.listen(gameplayPort, host, () => {
	console.log(`Gameplay server internal bind listening on ${host}:${gameplayPort}`)
	if (isServerLogEnabled()) {
		console.log(`Server trace log writing to ${getServerLogPath()}`)
	}
	traceServerEvent('server.started', {
		gameplayPort,
		genericPort,
		host,
		isRailwayDeployment,
		railwayApplicationPort,
		railwayTcpProxyDomain,
		railwayTcpProxyPort,
	})
	if (
		(explicitGameplayPort || railwayApplicationPort) &&
		genericPort &&
		gameplayPort !== genericPort
	) {
		console.log(
			`Gameplay TCP bind port detected; using internal port ${gameplayPort} instead of generic PORT ${genericPort}.`,
		)
	} else if (
		isRailwayDeployment &&
		!explicitGameplayPort &&
		!railwayApplicationPort &&
		genericPort &&
		gameplayPort !== genericPort
	) {
		console.log(
			`Railway TCP deployment detected; using internal fallback port ${gameplayPort} instead of generic PORT ${genericPort}. The public TCP proxy port is separate.`,
		)
	}
	if (railwayTcpProxyDomain && railwayTcpProxyPort) {
		console.log(
			`Railway TCP proxy available at ${railwayTcpProxyDomain}:${railwayTcpProxyPort} -> internal ${host}:${gameplayPort}`,
		)
	} else if (isRailwayDeployment) {
		console.log(
			'Railway deployment detected with no public TCP proxy configured yet. Create one in Public Networking -> TCP Proxy.',
		)
	}
	if (!isLoopbackHost(host)) {
		console.warn(
			'WARNING: Gameplay server is exposed beyond localhost. Use only on a trusted network unless you add your own transport security.',
		)
	}
})
startAdminServer(adminPort)
