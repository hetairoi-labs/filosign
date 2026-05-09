function concat(...parts: Uint8Array[]) {
	const len = parts.reduce((s, p) => s + p.length, 0);
	const out = new Uint8Array(len);
	let off = 0;
	for (const p of parts) {
		out.set(p, off);
		off += p.length;
	}
	return out;
}

async function hkdfSha512(
	ikm: ArrayBuffer,
	info: ArrayBuffer | undefined,
	lengthBytes: number,
) {
	const salt = new Uint8Array(64);
	const key = await crypto.subtle.importKey(
		"raw",
		ikm,
		{ name: "HKDF" },
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "HKDF", hash: "SHA-512", salt, info: info ?? new Uint8Array(0) },
		key,
		lengthBytes * 8,
	);
	return new Uint8Array(bits);
}

async function deriveAesGcmKey(sharedSecret: ArrayBuffer, info?: string) {
	const raw = await hkdfSha512(
		sharedSecret,
		info ? new TextEncoder().encode(info).buffer : undefined,
		32,
	);
	return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
		"encrypt",
		"decrypt",
	]);
}

export async function encrypt(args: {
	message: Uint8Array;
	secretKey: Uint8Array;
	info?: string;
	aad?: Uint8Array;
}) {
	const { message, secretKey, info, aad } = args;

	const key = await deriveAesGcmKey(new Uint8Array(secretKey).buffer, info);
	const iv = new Uint8Array(12);
	crypto.getRandomValues(iv);
	const ct = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: aad
				? new Uint8Array(aad).buffer
				: new Uint8Array(0).buffer,
		},
		key,
		new Uint8Array(message),
	);
	return concat(iv, new Uint8Array(ct));
}

export async function decrypt(args: {
	ciphertext: Uint8Array;
	secretKey: Uint8Array;
	info?: string;
	aad?: Uint8Array;
}) {
	const { ciphertext, secretKey, info, aad } = args;

	const ctArr = new Uint8Array(ciphertext);
	if (ctArr.length < 12) throw new Error("ciphertext too short");
	const iv = ctArr.slice(0, 12);
	const ct = ctArr.slice(12);
	const key = await deriveAesGcmKey(new Uint8Array(secretKey).buffer, info);
	const pt = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: aad
				? new Uint8Array(aad).buffer
				: new Uint8Array(0).buffer,
		},
		key,
		ct,
	);
	return new Uint8Array(pt);
}
