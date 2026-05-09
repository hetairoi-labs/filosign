import * as React from "react";
import Logo from "@/src/lib/components/custom/Logo";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarRail,
	useSidebar,
} from "@/src/lib/components/ui/sidebar";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { sidebarData } from "@/src/pages/dashboard/_components/sidebar/mock";
import { NavMain } from "@/src/pages/dashboard/_components/sidebar/nav-main";

export function DashboardSidebar({
	className,
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { state, setOpen } = useSidebar();
	const { sidebar, setSidebar } = useStorePersist();
	const isCollapsed = state === "collapsed";
	const isInitialized = React.useRef(false);

	// Initialize sidebar state from persisted state on mount
	React.useEffect(() => {
		if (!isInitialized.current) {
			setOpen(sidebar.isOpen);
			isInitialized.current = true;
		}
	}, [sidebar.isOpen, setOpen]);

	// Update persisted state when UI state changes (only after initialization)
	React.useEffect(() => {
		if (isInitialized.current) {
			const isOpen = state === "expanded";
			if (isOpen !== sidebar.isOpen) {
				setSidebar({ isOpen });
			}
		}
	}, [state, sidebar.isOpen, setSidebar]);

	return (
		<Sidebar className={className} collapsible="icon" {...props}>
			<SidebarHeader>
				<Logo
					textClassName="text-foreground font-semibold"
					isCollapsed={isCollapsed}
				/>
			</SidebarHeader>
			<SidebarContent className="">
				<NavMain items={sidebarData.navMain} />
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
