export function idb(args: { db: string; store: string }) {
	const { db: DB_NAME, store: STORE_NAME } = args;

	function idbOpen() {
		return new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, 1);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function put<T>(keyName: string, value: T) {
		const db = await idbOpen();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			tx.objectStore(STORE_NAME).put(value, keyName);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async function get<T>(keyName: string) {
		const db = await idbOpen();
		return new Promise<T | undefined>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const req = tx.objectStore(STORE_NAME).get(keyName);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function del(keyName: string) {
		const db = await idbOpen();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			tx.objectStore(STORE_NAME).delete(keyName);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	const secret = {
		put: (key: string, value: Uint8Array<ArrayBuffer>) =>
			put<Uint8Array<ArrayBuffer>>(key, value),
		get: (key: string) => get<Uint8Array<ArrayBuffer>>(key),
	};

	return { put, get, del, secret };
}

// TODO -> have sesssion keys on the server and use them to store local keys encrypted

// export async function generateAndStoreKey(keyName = "local-aes-key") {
// 	const key = await crypto.subtle.generateKey(
// 		{ name: "AES-GCM", length: 256 },
// 		false, // extractable is false  <-- IMPORTAANT
// 		["encrypt", "decrypt"],
// 	);
// 	await idbPut(keyName, key);
// 	return true;
// }

// export async function getKey(
// 	keyName = "local-aes-key",
// ): Promise<CryptoKey | null> {
// 	const k = await idbGet(keyName);
// 	if (!(k instanceof CryptoKey))
// 		throw new Error("Stored key is not a CryptoKey");

// 	return k ?? null;
// }

// // utility encrypt/decrypt
// export async function encryptWithStoredKey(
// 	plaintext: Uint8Array,
// 	keyName = "local-aes-key",
// ) {
// 	const key = await getKey(keyName);
// 	if (!key) throw new Error("key not found");
// 	const iv = crypto.getRandomValues(new Uint8Array(12));
// 	const ct = await crypto.subtle.encrypt(
// 		{ name: "AES-GCM", iv },
// 		key,
// 		plaintext,
// 	);
// 	return { iv: new Uint8Array(iv), ciphertext: new Uint8Array(ct) };
// }

// export async function decryptWithStoredKey(
// 	iv: Uint8Array,
// 	ciphertext: Uint8Array,
// 	keyName = "local-aes-key",
// ) {
// 	const key = await getKey(keyName);
// 	if (!key) throw new Error("key not found");
// 	const pt = await crypto.subtle.decrypt(
// 		{ name: "AES-GCM", iv },
// 		key,
// 		ciphertext,
// 	);
// 	return new Uint8Array(pt);
// }
