import { Hono } from "hono";
import coldInviteRoutes from "./cold-invite-routes";
import listRoutes from "./list-routes";
import pieceRoutes from "./piece-routes";
import registerRoutes from "./register-routes";
import uploadRoutes from "./upload-routes";

const app = new Hono();
app.route("/", uploadRoutes);
app.route("/", coldInviteRoutes);
app.route("/", registerRoutes);
app.route("/", listRoutes);
app.route("/", pieceRoutes);

export default app;
