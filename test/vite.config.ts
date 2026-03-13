import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		{
			name: "wasm-mime-type",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url?.endsWith(".wasm")) {
						res.setHeader("Content-Type", "application/wasm");
					}
					next();
				});
			},
		},
	],
	resolve: {
		alias: {
			"dilithium-crystals-js": "/dilithium-stub.js",
		},
	},
	server: {
		port: 3000,
		fs: {
			strict: false,
		},
		allowedHosts: ["pineal-incantational-holley.ngrok-free.dev"],
	},
	optimizeDeps: {
		exclude: [
			"dilithium-crystals-js",
			"@filosign/crypto-utils",
			"@filosign/react",
			"@filosign/contracts",
			// IDKit loads WASM via new URL("idkit_wasm_bg.wasm", import.meta.url).
			// Pre-bundling breaks this: import.meta.url points to the chunk, so the WASM
			// URL 404s and returns HTML instead of binary (magic word error).
			"@worldcoin/idkit-core",
		],
	},
	build: {
		commonjsOptions: {
			exclude: ["dilithium-crystals-js"],
		},
	},
});
