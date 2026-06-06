const REDACTED_LOG_VALUE = '[redacted]'
const MAX_LOG_STRING_LENGTH = 256
const MAX_LOG_OBJECT_DEPTH = 2
const MAX_LOG_OBJECT_KEYS = 16

const SENSITIVE_LOG_KEYS = new Set([
	'reconnectToken',
	'token',
	'privateKey',
	'private_key',
	'signature',
])
const LARGE_TEXT_LOG_KEYS = new Set([
	'cards',
	'cardData',
	'keys',
	'modHash',
	'rawMessage',
	'reroll_cost_total',
	'reroll_count',
	'vouchers',
])

const isSensitiveLogKey = (key: string | undefined): boolean => {
	if (!key) return false
	const normalizedKey = key.toLowerCase()
	return (
		SENSITIVE_LOG_KEYS.has(key) ||
		SENSITIVE_LOG_KEYS.has(normalizedKey) ||
		normalizedKey.endsWith('token')
	)
}

const summarizeStringForLog = (key: string | undefined, value: string) => {
	if (isSensitiveLogKey(key)) {
		return REDACTED_LOG_VALUE
	}
	if (key && LARGE_TEXT_LOG_KEYS.has(key)) {
		return `[string:${value.length}]`
	}
	if (value.length > MAX_LOG_STRING_LENGTH) {
		return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...[${value.length} chars]`
	}
	return value
}

const summarizeForLog = (
	value: unknown,
	key?: string,
	depth = 0,
): unknown => {
	if (typeof value === 'string') {
		return summarizeStringForLog(key, value)
	}
	if (typeof value === 'bigint') {
		return value.toString()
	}
	if (typeof value !== 'object' || value === null) {
		return value
	}
	if (Array.isArray(value)) {
		return `[array:${value.length}]`
	}
	if (depth >= MAX_LOG_OBJECT_DEPTH) {
		return '[object]'
	}

	const entries = Object.entries(value)
	const summarized = Object.fromEntries(
		entries
			.slice(0, MAX_LOG_OBJECT_KEYS)
			.map(([entryKey, entryValue]) => [
				entryKey,
				summarizeForLog(entryValue, entryKey, depth + 1),
			]),
	)
	if (entries.length > MAX_LOG_OBJECT_KEYS) {
		summarized._truncatedKeys = entries.length - MAX_LOG_OBJECT_KEYS
	}
	return summarized
}

export const summarizeFieldsForServerLog = (
	fields: Record<string, unknown>,
): Record<string, unknown> =>
	summarizeForLog(fields) as Record<string, unknown>
