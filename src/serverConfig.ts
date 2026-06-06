interface ServerEnvironment {
	[key: string]: string | undefined
	ADMIN_PORT?: string
	GAMEPLAY_PORT?: string
	HOST?: string
	PORT?: string
	RAILWAY_ENVIRONMENT_ID?: string
	RAILWAY_PROJECT_ID?: string
	RAILWAY_SERVICE_ID?: string
	RAILWAY_TCP_APPLICATION_PORT?: string
	RAILWAY_TCP_PROXY_DOMAIN?: string
	RAILWAY_TCP_PROXY_PORT?: string
}

interface ServerConfig {
	adminPort: number
	explicitGameplayPort?: number
	gameplayPort: number
	genericPort?: number
	host: string
	isRailwayDeployment: boolean
	railwayApplicationPort?: number
	railwayTcpProxyDomain?: string
	railwayTcpProxyPort?: number
}

const DEFAULT_LOCAL_GAMEPLAY_PORT = 12345
export const DEFAULT_RAILWAY_GAMEPLAY_PORT = 8788
export const DEFAULT_ADMIN_PORT = 8789

export const parseOptionalPort = (
	value: string | undefined,
): number | undefined => {
	if (!value) return undefined
	const parsed = Number(value)
	return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
		? parsed
		: undefined
}

const parsePort = (
	value: string | undefined,
	fallback: number,
): number => parseOptionalPort(value) ?? fallback

const parseHost = (
	value: string | undefined,
	fallback: string,
): string => {
	const trimmed = value?.trim()
	return trimmed ? trimmed : fallback
}

export const isLoopbackHost = (host: string): boolean =>
	host === '127.0.0.1' || host === 'localhost' || host === '::1'

const isRailwayEnvironment = (env: ServerEnvironment): boolean =>
	Boolean(
		env.RAILWAY_ENVIRONMENT_ID ||
			env.RAILWAY_SERVICE_ID ||
			env.RAILWAY_PROJECT_ID ||
			env.RAILWAY_TCP_APPLICATION_PORT ||
			env.RAILWAY_TCP_PROXY_DOMAIN,
	)

export const resolveServerConfig = (
	env: ServerEnvironment,
): ServerConfig => {
	const isRailwayDeployment = isRailwayEnvironment(env)
	const railwayApplicationPort = parseOptionalPort(
		env.RAILWAY_TCP_APPLICATION_PORT,
	)
	const explicitGameplayPort = parseOptionalPort(env.GAMEPLAY_PORT)
	const genericPort = parseOptionalPort(env.PORT)
	const inferredGameplayPort = isRailwayDeployment
		? railwayApplicationPort
		: genericPort
	const fallbackGameplayPort = isRailwayDeployment
		? DEFAULT_RAILWAY_GAMEPLAY_PORT
		: DEFAULT_LOCAL_GAMEPLAY_PORT

	return {
		adminPort: parsePort(env.ADMIN_PORT, DEFAULT_ADMIN_PORT),
		explicitGameplayPort,
		gameplayPort:
			explicitGameplayPort ??
			inferredGameplayPort ??
			fallbackGameplayPort,
		genericPort,
		host: parseHost(
			env.HOST,
			isRailwayDeployment ? '0.0.0.0' : '127.0.0.1',
		),
		isRailwayDeployment,
		railwayApplicationPort,
		railwayTcpProxyDomain: env.RAILWAY_TCP_PROXY_DOMAIN?.trim() || undefined,
		railwayTcpProxyPort: parseOptionalPort(env.RAILWAY_TCP_PROXY_PORT),
	}
}
