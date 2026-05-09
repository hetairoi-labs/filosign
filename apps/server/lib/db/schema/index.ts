import * as file from "./file";
import * as shareCapability from "./sharing";
import * as user from "./user";

// Combine all schema parts
const schema = {
	...shareCapability,
	...user,
	...file,
};

export * from "./file";
export * from "./sharing";
export * from "./user";

export default schema;
