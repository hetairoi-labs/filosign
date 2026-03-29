import path from "node:path";
import { getIdkitCoreDistDir } from "@/lib/build/idkit-core-vendor";

const idkitCoreDistDir = getIdkitCoreDistDir();
const idkitCoreDistResolved = path.resolve(idkitCoreDistDir);

export function idkitVendorResponse(req: Request) {
	const url = new URL(req.url);
	const prefix = "/vendor/worldcoin-idkit-core/";
	if (!url.pathname.startsWith(prefix)) {
		return new Response("Not Found", { status: 404 });
	}
	const suffix = url.pathname.slice(prefix.length);
	if (!suffix || suffix.includes("..")) {
		return new Response("Forbidden", { status: 403 });
	}
	const filePath = path.join(idkitCoreDistDir, suffix);
	const resolvedFile = path.resolve(filePath);
	if (
		resolvedFile !== idkitCoreDistResolved &&
		!resolvedFile.startsWith(idkitCoreDistResolved + path.sep)
	) {
		return new Response("Forbidden", { status: 403 });
	}
	const file = Bun.file(filePath);
	const type = suffix.endsWith(".wasm")
		? "application/wasm"
		: suffix.endsWith(".js")
			? "application/javascript"
			: "application/octet-stream";
	return new Response(file, {
		headers: { "Content-Type": type },
	});
}
