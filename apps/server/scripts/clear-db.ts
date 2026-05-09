import { Client } from "pg";
import env from "../env";

const client = new Client({
	connectionString: env.PG_URI.replace(":dbname", env.DB_NAME),
});

await client.connect();

try {
	await client.query("BEGIN");
	await client.query("DROP SCHEMA IF EXISTS public CASCADE");
	await client.query("CREATE SCHEMA public");
	await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER");
	await client.query("GRANT ALL ON SCHEMA public TO PUBLIC");
	await client.query("COMMIT");
} catch (err) {
	try {
		await client.query("ROLLBACK");
	} catch {
		// ignore rollback failure
	}
	throw err;
} finally {
	await client.end();
}
