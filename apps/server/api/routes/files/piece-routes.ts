import { Hono } from "hono";
import pieceAck from "./piece/piece-ack";
import pieceComplianceBundle from "./piece/piece-compliance-bundle";
import pieceDetail from "./piece/piece-detail";
import pieceIncentive from "./piece/piece-incentive";
import pieceS3 from "./piece/piece-s3";
import pieceSign from "./piece/piece-sign";
import pieceSignDraft from "./piece/piece-sign-draft";

/** Mounted in registration order — specific paths before `/:pieceCid`. */
const app = new Hono();
app.route("/", pieceComplianceBundle);
app.route("/", pieceDetail);
app.route("/", pieceAck);
app.route("/", pieceSignDraft);
app.route("/", pieceSign);
app.route("/", pieceIncentive);
app.route("/", pieceS3);

export default app;
