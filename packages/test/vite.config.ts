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
			"@": "/src",
		},
	},
	server: {
		port: 3000,
		strictPort: true,
		host: true,
		fs: {
			strict: false,
		},
	},
	optimizeDeps: {
		exclude: [
			"@filosign/crypto-utils",
			"@filosign/react",
			"@filosign/contracts",
		],
	},
	build: {
		commonjsOptions: {
			exclude: [],
		},
	},
});
