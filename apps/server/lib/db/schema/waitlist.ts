import * as t from "drizzle-orm/pg-core";
import { timestamps } from "../helpers";

export const waitlist = t.pgTable("waitlist", {
	email: t.text().primaryKey(),
	...timestamps,
});
