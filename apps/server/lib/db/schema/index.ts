import * as file from "./file";
import * as shareCapability from "./sharing";
import * as user from "./user";
import * as waitlist from "./waitlist";

// Combine all schema parts
const schema = {
	...shareCapability,
	...user,
	...file,
	...waitlist,
};

export * from "./file";
export * from "./sharing";
export * from "./user";
export * from "./waitlist";

export default schema;
