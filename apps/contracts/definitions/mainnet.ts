import type { definitions as localDef } from "./local.js";

type ChainDefs = (typeof localDef)[keyof typeof localDef];
export const definitions: Record<string, ChainDefs> = {};
