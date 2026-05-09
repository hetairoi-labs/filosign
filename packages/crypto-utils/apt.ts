import fs from "node:fs";
import { KEM, signatures } from "./src/lib-node";

const d = {
	KEM: await KEM.keyGen({ seed: new Uint8Array(64) }),
	signatures: await signatures.keyGen({ seed: new Uint8Array(64) }),
};

fs.writeFileSync(
	"apt-get.ts",
	`export const KEM = ${JSON.stringify(d.KEM)};
export const signatures = ${JSON.stringify(d.signatures)};`,
);
