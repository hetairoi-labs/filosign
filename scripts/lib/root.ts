import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root when called from `scripts/<orchestrator>.ts`. */
export function repoRoot(metaUrl: string): string {
	return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..");
}
