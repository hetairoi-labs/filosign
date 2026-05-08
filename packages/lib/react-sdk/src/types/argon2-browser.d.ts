declare module "argon2-browser" {
	export const ArgonType: {
		Argon2d: number;
		Argon2i: number;
		Argon2id: number;
	};

	export function hash(args: {
		pass: string;
		salt: Uint8Array;
		type: number;
		mem: number;
		time: number;
		parallelism: number;
		hashLen: number;
	}): Promise<{
		hash: Uint8Array;
		hashHex: string;
		encoded: string;
	}>;

	const _default: {
		ArgonType: typeof ArgonType;
		hash: typeof hash;
	};

	export default _default;
}
