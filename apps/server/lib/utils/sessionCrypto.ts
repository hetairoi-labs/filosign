import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	scryptSync,
} from "node:crypto";
import env from "@/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Derive encryption key from master key using scrypt
function getMasterKey(): Buffer {
	// Use a fixed salt derived from the master key itself
	const salt = Buffer.from(
		Buffer.from(env.SESSION_MASTER_KEY).toString("base64").slice(0, 32),
	);
	return scryptSync(env.SESSION_MASTER_KEY, salt, KEY_LENGTH);
}

/**
 * Encrypt a seed for server-side storage
 * @param seed - The plaintext seed bytes
 * @returns Object with ciphertext, nonce (iv), and authTag
 */
export function encryptSeed(seed: Uint8Array): {
	ciphertext: Uint8Array;
	nonce: Uint8Array;
	authTag: Uint8Array;
} {
	const key = getMasterKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([
		cipher.update(Buffer.from(seed)),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return {
		ciphertext: new Uint8Array(encrypted),
		nonce: new Uint8Array(iv),
		authTag: new Uint8Array(authTag),
	};
}

/**
 * Decrypt a seed from server storage
 * @param ciphertext - Encrypted seed bytes
 * @param nonce - IV used for encryption
 * @param authTag - GCM authentication tag
 * @returns Decrypted plaintext seed
 */
export function decryptSeed(
	ciphertext: Uint8Array,
	nonce: Uint8Array,
	authTag: Uint8Array,
): Uint8Array {
	const key = getMasterKey();
	const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(nonce));
	decipher.setAuthTag(Buffer.from(authTag));

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(ciphertext)),
		decipher.final(),
	]);

	return new Uint8Array(decrypted);
}

/**
 * Hash a session token for database storage/lookup
 * @param token - The session token
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a cryptographically secure session token
 * @returns 32-byte random token as hex string
 */
export function generateSessionToken(): string {
	return randomBytes(32).toString("hex");
}
