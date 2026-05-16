import { Hono } from "hono";
import inboxRoutes from "./inbox-routes";
import invitesRoutes from "./invites-routes";
import requestsRoutes from "./requests-routes";

const app = new Hono();
app.route("/", requestsRoutes);
app.route("/", invitesRoutes);
app.route("/", inboxRoutes);

export default app;
