import {
	ChartBarIcon,
	FileTextIcon,
	GearIcon,
	ShieldCheckIcon,
	SignatureIcon,
	UsersIcon,
} from "@phosphor-icons/react";

// This is sample data.
export const userData = {
	name: "Styles",
	email: "styles@filosign.com",
	avatar:
		"https://cdn.dribbble.com/userupload/32112291/file/original-4d4ef0e9749c47c0e20c93e61583233c.jpg?resize=400x0",
};

export const sidebarData = {
	user: userData,
	orgs: [
		{
			name: "Legal Partners LLP",
			logo: ShieldCheckIcon,
			plan: "Enterprise",
		},
		{
			name: "Blockchain Legal Co",
			logo: UsersIcon,
			plan: "Professional",
		},
		{
			name: "Digital Contracts Inc",
			logo: ChartBarIcon,
			plan: "Business",
		},
	],
	navMain: [
		{
			title: "Documents",
			url: "#",
			icon: FileTextIcon,
			isActive: false,
			items: [
				{
					title: "All Documents",
					url: "/dashboard/document/all",
				},
			],
		},
		{
			title: "Signatures",
			url: "#",
			icon: SignatureIcon,
			items: [
				{
					title: "Create Signature",
					url: "/dashboard/signature/create",
				},
			],
		},
		{
			title: "Analytics",
			url: "#",
			icon: ChartBarIcon,
			items: [
				{
					title: "Dashboard",
					url: "/dashboard",
				},
			],
		},
		{
			title: "Settings",
			url: "#",
			icon: GearIcon,
			items: [
				{
					title: "Profile",
					url: "/dashboard/settings/profile",
				},
				{
					title: "Connections",
					url: "/dashboard/connections",
				},
				{
					title: "Permissions",
					url: "/dashboard/settings/permissions",
				},
			],
		},
	],
	projects: [
		{
			name: "Q1 Contracts",
			url: "#",
			icon: FileTextIcon,
		},
		{
			name: "Client Agreements",
			url: "#",
			icon: UsersIcon,
		},
		{
			name: "Legal Documents",
			url: "#",
			icon: ShieldCheckIcon,
		},
		{
			name: "Partnership Deals",
			url: "#",
			icon: ChartBarIcon,
		},
	],
};
