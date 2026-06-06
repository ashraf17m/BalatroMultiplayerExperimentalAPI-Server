import { createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

const getStartupPathRoots = () => {
	const startupPath = process.argv[1]
	if (!startupPath) return []

	const startupDirectory = dirname(resolve(startupPath))
	return [
		startupDirectory,
		resolve(startupDirectory, '..'),
		resolve(startupDirectory, '..', '..'),
	]
}

const getAdminPublicKeyCandidates = (): string[] => {
	const configuredPath = process.env.ADMIN_PUBLIC_KEY_PATH
	const normalizedConfiguredPath = configuredPath
		? isAbsolute(configuredPath)
			? configuredPath
			: resolve(process.cwd(), configuredPath)
		: null

	const projectRoots = [
		...new Set([
			process.cwd(),
			...getStartupPathRoots(),
		]),
	]

	const candidates = [
		normalizedConfiguredPath,
		...projectRoots.flatMap((root) => [
			resolve(root, '.github', 'admin_public.pem'),
			resolve(root, 'admin_public.pem'),
		]),
	]

	return [
		...new Set(
			candidates.filter((candidate): candidate is string => Boolean(candidate)),
		),
	]
}

export const loadAdminPublicKey = (): {
	key: ReturnType<typeof createPublicKey> | null
	path: string | null
} => {
	for (const candidatePath of getAdminPublicKeyCandidates()) {
		if (!existsSync(candidatePath)) continue

		try {
			return {
				key: createPublicKey(readFileSync(candidatePath, 'utf-8')),
				path: candidatePath,
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			console.warn(
				`WARNING: Failed to load admin_public.pem from ${candidatePath}: ${message}`,
			)
			return { key: null, path: null }
		}
	}

	return { key: null, path: null }
}

export const createAdminSignatureVerifier = (
	adminPublicKey: ReturnType<typeof createPublicKey>,
) => {
	return (payload: string, signature: string): boolean => {
		try {
			return cryptoVerify(
				null,
				Buffer.from(payload),
				adminPublicKey,
				Buffer.from(signature, 'base64'),
			)
		} catch {
			return false
		}
	}
}
