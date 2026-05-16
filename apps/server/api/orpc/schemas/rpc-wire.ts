import { z } from "zod";

export const zDateWire = z.union([z.date(), z.string()]);

export const rpcEmptyOutputSchema = z.object({});
