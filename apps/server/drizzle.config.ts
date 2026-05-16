import "./lib/polyfills/bigint-json";
import { defineConfig } from "drizzle-kit";
import env from "./env";

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/db/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: env.PG_URI.replace(":dbname", env.DB_NAME),
	},
	casing: "snake_case",
});
