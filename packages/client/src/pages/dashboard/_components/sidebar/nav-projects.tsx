import {
	DotsThreeIcon,
	FolderIcon,
	ShareIcon,
	TrashIcon,
} from "@phosphor-icons/react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/src/lib/components/ui/sidebar";

export function NavProjects({
	projects,
}: {
	projects: {
		name: string;
		url: string;
		icon: React.ElementType;
	}[];
}) {
	const { isMobile, state, setOpen } = useSidebar();

	const handleIconClick = () => {
		if (state === "collapsed") {
			setOpen(true);
		}
	};

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>Recent Documents</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton
							render={
								<a
									href={item.url}
									onClick={handleIconClick}
									className="cursor-pointer"
								>
									<item.icon className="size-6 group-data-[collapsible=icon]:size-9 group-data-[collapsible=offcanvas]:size-7.5" />
									<span className="group-data-[collapsible=icon]:hidden">
										{item.name}
									</span>
								</a>
							}
						/>
						<DropdownMenu>
							<DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
								<DotsThreeIcon className="size-6" />
								<span className="sr-only">More</span>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-48 rounded-lg"
								side={isMobile ? "bottom" : "right"}
								align={isMobile ? "end" : "start"}
							>
								<DropdownMenuItem>
									<FolderIcon className="size-6" />
									<span>View Document</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<ShareIcon className="size-6" />
									<span>Send for Signature</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<TrashIcon className="size-6" />
									<span>Delete Document</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				))}
				<SidebarMenuItem>
					<SidebarMenuButton
						onClick={handleIconClick}
						className="cursor-pointer"
					>
						<DotsThreeIcon className="size-6 group-data-[collapsible=icon]:size-9 group-data-[collapsible=offcanvas]:size-7.5" />
						<span className="group-data-[collapsible=icon]:hidden">
							View All
						</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	);
}
