import { Hono } from "hono";
import waitlist from "./waitlist";

const routes = new Hono().route("/waitlist", waitlist);

export default routes;
