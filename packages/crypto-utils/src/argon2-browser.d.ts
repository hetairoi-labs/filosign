declare module "argon2-browser" {
	const argon2: {
		hash: (args: {
			pass: string;
			salt: Uint8Array;
			type: number;
			mem: number;
			time: number;
			parallelism: number;
			hashLen: number;
		}) => Promise<{ hash: Uint8Array }>;
		ArgonType: {
			Argon2id: number;
		};
	};

	export default argon2;
}

declare module "argon2-browser/dist/argon2-bundled.min.js" {
	const argon2: {
		hash: (args: {
			pass: string;
			salt: Uint8Array;
			type: number;
			mem: number;
			time: number;
			parallelism: number;
			hashLen: number;
		}) => Promise<{ hash: Uint8Array }>;
		ArgonType: {
			Argon2id: number;
		};
	};

	export default argon2;
}
