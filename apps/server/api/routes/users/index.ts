import { Hono } from "hono";
import profile from "./profile";
import signatures from "./signatures";

export default new Hono()
	.route("/profile", profile)
	.route("/signatures", signatures);
