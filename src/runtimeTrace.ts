import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { summarizeFieldsForServerLog } from './logSummaries.js'

const DEFAULT_SERVER_LOG_PATH = resolve(process.cwd(), 'logs/server-runtime.log')

const isTruthyEnvValue = (value: string | undefined) =>
	['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '')

const isRuntimeTraceEnabled = () => process.env.MP_RUNTIME_TRACE === '1'

const isLocalServerLogSession = () =>
	isTruthyEnvValue(process.env.MP_LOCAL_SERVER)

export const isServerLogEnabled = () =>
	isTruthyEnvValue(process.env.MP_SERVER_LOG)

export const isVerboseServerLogEnabled = () =>
	isTruthyEnvValue(process.env.MP_VERBOSE_SERVER_LOG)

export const isServerConsoleLogEnabled = () =>
	isTruthyEnvValue(process.env.MP_SERVER_LOG_CONSOLE) ||
	isVerboseServerLogEnabled()

export const isServerLogColorEnabled = () =>
	isLocalServerLogSession() &&
	isTruthyEnvValue(process.env.MP_SERVER_LOG_COLOR) &&
	!process.env.NO_COLOR

export const isFullServerPayloadLogEnabled = () =>
	isLocalServerLogSession() &&
	isTruthyEnvValue(process.env.MP_SERVER_LOG_FULL_PAYLOAD)

export const getServerLogPath = () =>
	process.env.MP_SERVER_LOG_PATH
		? resolve(process.env.MP_SERVER_LOG_PATH)
		: DEFAULT_SERVER_LOG_PATH

let serverLogDirectoryReady: string | undefined

const ensureServerLogDirectory = () => {
	const logDirectory = dirname(getServerLogPath())
	if (serverLogDirectoryReady === logDirectory) return

	mkdirSync(logDirectory, { recursive: true })
	serverLogDirectoryReady = logDirectory
}

const appendServerLogLine = (line: string) => {
	ensureServerLogDirectory()
	appendFileSync(getServerLogPath(), `${line}\n`, 'utf8')
}

const writeServerLogLine = (line: string) => {
	if (!isServerLogEnabled()) return

	appendServerLogLine(line)
}

const formatRuntimeTraceValue = (value: unknown): string => {
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return String(value)
	}
	if (value === null) return 'null'
	if (value === undefined) return 'undefined'
	return `<${typeof value}>`
}

const formatRuntimeTraceFields = (fields: Record<string, unknown>) =>
	Object.keys(fields)
		.sort()
		.map((key) => `${key}=${formatRuntimeTraceValue(fields[key])}`)
		.join(' ')

const CLIENT_COLOR_CODES = [
	31, // red
	32, // green
	33, // yellow
	34, // blue
	35, // magenta
	36, // cyan
	91, // bright red
	92, // bright green
	93, // bright yellow
	94, // bright blue
	95, // bright magenta
	96, // bright cyan
]

const ANSI_RESET = '\u001b[0m'

const hashString = (value: string) => {
	let hash = 0
	for (let index = 0; index < value.length; index++) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0
	}
	return hash
}

const getClientColorCode = (fields: Record<string, unknown>) => {
	const clientId = fields.clientId
	if (typeof clientId !== 'string' || clientId.length === 0) return undefined

	return CLIENT_COLOR_CODES[hashString(clientId) % CLIENT_COLOR_CODES.length]
}

const colorizeServerConsoleLine = (
	line: string,
	fields: Record<string, unknown>,
) => {
	if (!isServerLogColorEnabled()) return line

	const colorCode = getClientColorCode(fields)
	if (!colorCode) return line

	return `\u001b[${colorCode}m${line}${ANSI_RESET}`
}

const writeRuntimeConsoleLine = (
	timestamp: string,
	event: string,
	fields: Record<string, unknown>,
) => {
	const details = formatRuntimeTraceFields(fields)
	const suffix = details ? ` ${details}` : ''
	console.log(
		colorizeServerConsoleLine(
			`${timestamp}: [runtime] ${event}${suffix}`,
			fields,
		),
	)
}

const writeServerConsoleLine = (
	timestamp: string,
	event: string,
	fields: Record<string, unknown>,
) => {
	const line = formatServerEventLine(timestamp, event, fields)
	console.log(colorizeServerConsoleLine(line, fields))
}

const formatServerEventLine = (
	timestamp: string,
	event: string,
	fields: Record<string, unknown>,
) =>
	`${timestamp}: [server] ${event} ${JSON.stringify(
		isFullServerPayloadLogEnabled()
			? fields
			: summarizeFieldsForServerLog(fields),
	)}`

export const traceRuntimeEvent = (
	event: string,
	fields: Record<string, unknown> = {},
) => {
	const runtimeTraceEnabled = isRuntimeTraceEnabled()
	const serverLogEnabled = isServerLogEnabled()
	const serverConsoleLogEnabled = isServerConsoleLogEnabled()
	if (!runtimeTraceEnabled && !serverLogEnabled && !serverConsoleLogEnabled) return

	const timestamp = new Date().toISOString()
	if (runtimeTraceEnabled || serverConsoleLogEnabled) {
		writeRuntimeConsoleLine(timestamp, event, fields)
	}
	writeServerLogLine(
		`${timestamp}: [runtime] ${event} ${JSON.stringify(
			summarizeFieldsForServerLog(fields),
		)}`,
	)
}

export const traceServerEvent = (
	event: string,
	fields: Record<string, unknown> = {},
) => {
	const serverLogEnabled = isServerLogEnabled()
	const serverConsoleLogEnabled = isServerConsoleLogEnabled()
	if (!serverLogEnabled && !serverConsoleLogEnabled) return

	const timestamp = new Date().toISOString()
	if (serverConsoleLogEnabled) {
		writeServerConsoleLine(timestamp, event, fields)
	}
	writeServerLogLine(formatServerEventLine(timestamp, event, fields))
}

export const traceServerEventDeferred = (
	event: string,
	fields: Record<string, unknown> = {},
) => {
	const serverLogEnabled = isServerLogEnabled()
	const serverConsoleLogEnabled = isServerConsoleLogEnabled()
	if (!serverLogEnabled && !serverConsoleLogEnabled) return

	const timestamp = new Date().toISOString()
	const outputFields = isFullServerPayloadLogEnabled()
		? fields
		: summarizeFieldsForServerLog(fields)
	const line = `${timestamp}: [server] ${event} ${JSON.stringify(
		outputFields,
	)}`
	const consoleLine = serverConsoleLogEnabled
		? colorizeServerConsoleLine(line, fields)
		: undefined

	setImmediate(() => {
		if (consoleLine) {
			console.log(consoleLine)
		}
		if (serverLogEnabled) {
			appendServerLogLine(line)
		}
	})
}
