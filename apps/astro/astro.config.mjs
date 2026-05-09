// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
	server: {
		port: 3001,
	},
	redirects: {
		// Redirect old routes if needed
		"/app": "http://localhost:3000",
		"/dashboard": "http://localhost:3000/dashboard",
	},
});
