import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			buffer: "buffer",
		},
	},
	define: {
		global: "globalThis",
	},
	server: {
		port: 3001,
	},
	envPrefix: "VITE_",
	optimizeDeps: {
		exclude: ["argon2-browser"],
		include: ["buffer"],
	},
	build: {
		outDir: "dist",
		sourcemap: true,
	},
});
