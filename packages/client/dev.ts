import { serve } from "bun";
import { closeDatabase } from "./api/lib/db";
import html from "./src/index.html";

const server = serve({
	development: {
		hmr: true,
		console: true,
	},

	idleTimeout: 60,

	routes: {
		"/static/*": (req) => {
			const url = new URL(req.url);
			const filePath = url.pathname.replace("/static/", "");
			const file = Bun.file(`public/${filePath}`);
			return new Response(file);
		},

		"/*": html,

		"/dilithium.wasm": () => {
			const file = Bun.file(`public/dilithium.wasm`);
			return new Response(file);
		},
	},

	fetch(req) {
		// Handle static files in fetch handler as well (for non-GET requests)
		if (req.url.includes("/static/")) {
			const url = new URL(req.url);
			const filePath = url.pathname.replace("/static/", "");
			const file = Bun.file(`public/${filePath}`);
			return new Response(file);
		}

		return new Response("Not Found", { status: 404 });
	},

	error(error) {
		console.error(error);
		return new Response(`Internal Error: ${error.message}`, { status: 500 });
	},
});

console.log(`Dev server running at ${server.url} 🚀`);
console.log(`BUN VERSION: ${Bun.version}`);

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down server and closing database...");
	closeDatabase();
	server.stop();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\nShutting down server and closing database...");
	closeDatabase();
	server.stop();
	process.exit(0);
});
