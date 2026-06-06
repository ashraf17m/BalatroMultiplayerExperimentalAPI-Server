import type Client from './Client.js'
import type {
	ActionHandlerArgs,
	ActionSyncClient,
	ActionVersion,
} from './actions.js'
import { sendSystemError } from './protocol/v2/index.js'

const minimumSupportedClientVersion = '0.1.0'
const testedSmodsBaseline = '1.0.0~BETA-1606b'
const compatibilityWarning = `[WARN] Server expects a compatible Multiplayer client (minimum version ${minimumSupportedClientVersion}, tested with SMODS ${testedSmodsBaseline}).`

const parseComparableVersion = (
	value: string,
): [major: number, minor: number, patch: number] | null => {
	const match = value.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
	if (!match) {
		return null
	}

	const major = Number(match[1])
	const minor = Number(match[2])
	const patch = Number(match[3] ?? '0')

	if (![major, minor, patch].every(Number.isFinite)) {
		return null
	}

	return [major, minor, patch]
}

export const versionAction = (
	{ version }: ActionHandlerArgs<ActionVersion>,
	client: Client,
) => {
	const clientVersion = parseComparableVersion(version)
	const expectedVersion = parseComparableVersion(minimumSupportedClientVersion)

	if (!clientVersion || !expectedVersion) {
		return
	}

	const [clientMajor, clientMinor, clientPatch] = clientVersion
	const [serverMajor, serverMinor, serverPatch] = expectedVersion

	if (
		clientMajor < serverMajor ||
		(clientMajor === serverMajor && clientMinor < serverMinor) ||
		(clientMajor === serverMajor &&
			clientMinor === serverMinor &&
			clientPatch < serverPatch)
	) {
		sendSystemError(client, compatibilityWarning)
	}
}

export const syncClientAction = (
	{ isCached }: ActionHandlerArgs<ActionSyncClient>,
	client: Client,
) => {
	client.isCached = isCached
}
