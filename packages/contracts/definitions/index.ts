import { definitions as local } from "./local";
import { definitions as mainnet } from "./mainnet";
import { definitions as testnet } from "./testnet";

const CHAIN =
	(typeof process !== "undefined" && process.env?.CHAIN) ??
	(typeof process !== "undefined" && process.env?.BUN_PUBLIC_CHAIN) ??
	"local";

export const definitions =
	CHAIN === "mainnet" ? mainnet : CHAIN === "testnet" ? testnet : local;
