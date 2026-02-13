import { Client } from "pg";
import env from "../env";

if (!env.DB_NAME.includes("test")) {
	throw new Error("are y sure you want to drop the database");
}

const client = new Client({
	connectionString: env.PG_URI.replace(":dbname", "postgres"),
});

await client.connect();

try {
	await client.query(`DROP DATABASE IF EXISTS ${env.DB_NAME}`);
} catch (_) {}

await client.query(`CREATE DATABASE ${env.DB_NAME}`);

await client.end();
