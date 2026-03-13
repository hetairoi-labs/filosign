import { Archive, FileText, Folder, Image } from "@phosphor-icons/react";

export interface FileOrFolder {
	type: "folder" | "file";
	name: string;
	id: string;
	fileType?: "document" | "image" | "archive" | "other";
	lastModified?: string;
	icon?: React.ComponentType<unknown>;
}

export const initialFilesAndFolders: FileOrFolder[] = [
	{ type: "folder", name: "Client Contracts", id: "1" },
	{ type: "folder", name: "Internal Memos", id: "2" },
	{ type: "folder", name: "Archived Projects", id: "3" },
	{ type: "folder", name: "Design Assets", id: "4" },
	{
		type: "file",
		name: "Project Alpha Agreement.pdf",
		id: "5",
		fileType: "document",
		lastModified: "2024-07-28",
	},
	{
		type: "file",
		name: "Company Logo Final.png",
		id: "6",
		fileType: "image",
		lastModified: "2024-07-27",
	},
	{
		type: "file",
		name: "Q2 Financials.zip",
		id: "7",
		fileType: "archive",
		lastModified: "2024-07-26",
	},
	{
		type: "file",
		name: "Onboarding Manual.docx",
		id: "8",
		fileType: "document",
		lastModified: "2024-07-25",
	},
	{
		type: "file",
		name: "Website Mockup.jpg",
		id: "9",
		fileType: "image",
		lastModified: "2024-07-24",
	},
	{
		type: "file",
		name: "Old Invoices.zip",
		id: "10",
		fileType: "archive",
		lastModified: "2024-07-23",
	},
	{
		type: "file",
		name: "Meeting Notes.txt",
		id: "11",
		fileType: "other",
		lastModified: "2024-07-22",
	},
	{
		type: "file",
		name: "Employee Handbook.pdf",
		id: "12",
		fileType: "document",
		lastModified: "2024-07-21",
	},
];

export const fileTypeIcons = {
	document: FileText,
	image: Image,
	archive: Archive,
	other: FileText,
	folder: Folder,
};
