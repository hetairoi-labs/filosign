import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
	buildContentSecurityPolicy,
	parseApiOrigin,
	securityHeadersRecord,
} from "./vite/security-headers";

export default defineConfig(({ mode, command }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const apiOrigin = parseApiOrigin(env.VITE_PLATFORM_URL);
	const isDev = mode === "development";

	return {
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				quoteStyle: "double",
			}),
			react(),
			tailwindcss(),
			{
				name: "filosign-inject-csp-meta",
				transformIndexHtml: {
					order: "post",
					handler(html) {
						if (command !== "build") {
							return html;
						}
						return {
							html,
							tags: [
								{
									tag: "meta",
									injectTo: "head-prepend",
									attrs: {
										"http-equiv": "Content-Security-Policy",
										content: buildContentSecurityPolicy(false, apiOrigin),
									},
								},
							],
						};
					},
				},
			},
		],
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
			port: 3000,
			headers: securityHeadersRecord(isDev, apiOrigin),
		},
		preview: {
			headers: securityHeadersRecord(false, apiOrigin),
		},
		envPrefix: "VITE_",
		optimizeDeps: {
			include: ["buffer"],
		},
		build: {
			outDir: "dist",
			sourcemap: true,
		},
	};
});
