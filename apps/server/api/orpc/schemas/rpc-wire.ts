import { z } from "zod";

/** Drizzle timestamps / persisted dates may hydrate as ISO strings across JSON-RPC. */
export const zDateWire = z.union([z.date(), z.string()]);

/** Handlers `return {}` after successful mutations. */
export const rpcEmptyOutputSchema = z.object({});
