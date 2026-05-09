import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import * as React from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/src/lib/components/ui/sidebar";

export function TeamSwitcher({
	orgs,
}: {
	orgs: {
		name: string;
		logo: React.ElementType;
		plan: string;
	}[];
}) {
	const { state, setOpen } = useSidebar();
	const [activeOrganization, setActiveOrganization] = React.useState(orgs[0]);
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

	const handleIconClick = () => {
		if (state === "collapsed") {
			setOpen(true);
		}
	};

	if (!activeOrganization) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu onOpenChange={setIsDropdownOpen}>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer transition-all duration-150 hover:bg-accent/50"
								onClick={handleIconClick}
							/>
						}
					>
						<div className=" text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center bg-muted/10 p-1 rounded-full">
							<activeOrganization.logo className="size-6" />
						</div>
						<div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
							<p className="truncate">{activeOrganization.name}</p>
						</div>
						<CaretDownIcon
							className={`ml-auto size-6 group-data-[collapsible=icon]:hidden transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						align="start"
						side={"top"}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Organisations
						</DropdownMenuLabel>
						{orgs.map((org, index) => (
							<motion.div
								key={org.name}
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									type: "spring",
									stiffness: 300,
									damping: 20,
									delay: index * 0.03,
								}}
							>
								<DropdownMenuItem
									onClick={() => setActiveOrganization(org)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-md">
										<org.logo className="size-5 shrink-0" />
									</div>
									{org.name}
								</DropdownMenuItem>
							</motion.div>
						))}
						<DropdownMenuSeparator />
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 300,
								damping: 20,
								delay: orgs.length * 0.03 + 0.05,
							}}
						>
							<DropdownMenuItem className="gap-2 p-2">
								<div className="flex size-6 items-center justify-center rounded-md bg-transparent">
									<PlusIcon className="size-6" />
								</div>
								<div className="font-medium">Add organization</div>
							</DropdownMenuItem>
						</motion.div>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
