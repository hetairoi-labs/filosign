export type SignatureField = {
	id: string;
	type:
		| "signature"
		| "initial"
		| "date"
		| "name"
		| "email"
		| "text"
		| "checkbox";
	x: number;
	y: number;
	page: number;
	documentId: string;
	required: boolean;
	label?: string;
};

export type Document = {
	id: string;
	name: string;
	url: string;
	pages: number;
};

// Mock document data
export const mockDocuments: Document[] = [
	{
		id: "1",
		name: "Contract Agreement.pdf",
		url: "/mock-document.pdf",
		pages: 3,
	},
];

// Field type configurations
export const fieldTypeConfigs = [
	{
		type: "signature" as const,
		label: "Signature",
		description: "Digital signature field",
	},
	{
		type: "initial" as const,
		label: "Initial",
		description: "Initial field",
	},
	{
		type: "date" as const,
		label: "Date Signed",
		description: "Date field",
	},
	{
		type: "name" as const,
		label: "Name",
		description: "Name field",
	},
	{
		type: "email" as const,
		label: "Email",
		description: "Email field",
	},
	{
		type: "text" as const,
		label: "Text",
		description: "Text input field",
	},
	{
		type: "checkbox" as const,
		label: "Checkbox",
		description: "Checkbox field",
	},
];
