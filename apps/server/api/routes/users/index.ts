import { Hono } from "hono";
import avatarRoute from "./avatar-route";

/** Multipart carve-out under `/api/users/profile/avatar` */
export default new Hono().route("/profile/avatar", avatarRoute);
