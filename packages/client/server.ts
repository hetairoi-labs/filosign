import path from "node:path";
import { serve } from "bun";
import { env } from "@/env";
import { getIdkitCoreDistDir } from "@/lib/build/idkit-core-vendor";
import html from "@/src/index.html";

const idkitCoreDistDir = getIdkitCoreDistDir();
const idkitCoreDistResolved = path.resolve(idkitCoreDistDir);

function idkitVendorResponse(req: Request) {
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

const isDev = env.NODE_ENV === "development";

const server = serve({
	development: isDev
		? {
				hmr: true,
				console: false,
			}
		: false,
	port: env.PORT,
	idleTimeout: 60,

	routes: {
		"/vendor/worldcoin-idkit-core/*": idkitVendorResponse,

		"/static/*": (req) => {
			const url = new URL(req.url);
			const filePath = url.pathname.replace("/static/", "");
			const file = Bun.file(`public/${filePath}`);
			return new Response(file);
		},

		"/dilithium.wasm": () => {
			const file = Bun.file(`public/dilithium.wasm`);
			return new Response(file);
		},

		"/*": html,
	},

	error(error) {
		console.error(error);
		return new Response(`Internal Error: ${error.message}`, { status: 500 });
	},
});

console.log("Server", {
	bunVersion: Bun.version,
	port: env.PORT,
	env: isDev ? "development" : "production",
	url: server.url.href,
});
