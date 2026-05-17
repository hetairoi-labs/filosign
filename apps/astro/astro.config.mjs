// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import remarkGfm from "remark-gfm";

const site =
	(typeof process !== "undefined" && process.env.PUBLIC_ASTRO_URL) ||
	"https://filosign.xyz";

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [
		react(),
		mdx({
			remarkPlugins: [remarkGfm],
		}),
		sitemap({
			filter: (page) => !page.includes("/open-graph/"),
		}),
	],
	vite: {
		resolve: {
			dedupe: ["react", "react-dom"],
		},
		optimizeDeps: {
			include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
		},
	},
	server: {
		port: 3002,
	},
});
