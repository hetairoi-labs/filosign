declare module "argon2-browser" {
	export default {
		hash: (args: {
			pass: string;
			salt: Uint8Array;
			type: number;
			mem: number;
			time: number;
			parallelism: number;
			hashLen: number;
		}) => Promise<{ hash: Uint8Array }>,
		ArgonType: {
			Argon2id: number;
		},
	};
}
