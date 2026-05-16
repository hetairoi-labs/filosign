import { Hono } from "hono";
import profileCore from "./profile-core";
import profileEmail from "./profile-email";
import profileRegistration from "./profile-registration";

const app = new Hono();
app.route("/", profileCore);
app.route("/", profileEmail);
app.route("/", profileRegistration);

export default app;
