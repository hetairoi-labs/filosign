import * as KEM from "./impl/browser/KEM";
import * as signatures from "./impl/browser/signatures";
import * as encryption from "./impl/node/encryption";
import * as hash from "./impl/node/hash";
import * as utils from "./impl/node/utils";

export * from "./impl/node/utils";

const node = { encryption, hash, KEM, signatures, ...utils };

export default node;

export { encryption, hash, KEM, signatures };
