import { CaretRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/src/lib/components/ui/sidebar";
import { useStorePersist } from "@/src/lib/hooks/use-store";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: React.ElementType;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
}) {
	const { state, setOpen } = useSidebar();
	const { sidebar, setSidebar } = useStorePersist();
	const isCollapsed = state === "collapsed";
	const openItems = new Set(sidebar.expandedItems);

	React.useEffect(() => {
		if (state === "collapsed") {
			setSidebar({ expandedItems: [] });
		}
	}, [state, setSidebar]);

	const handleIconClick = () => {
		if (state === "collapsed") {
			setOpen(true);
		}
	};

	const toggleItem = (title: string) => {
		const expandedItems = sidebar.expandedItems.includes(title)
			? [] // If clicking on expanded item, collapse it (clear all)
			: [title]; // If clicking on collapsed item, expand only this one
		setSidebar({ expandedItems, lastClickedMenu: title });
	};

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => {
					const isOpen = openItems.has(item.title);

					return (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								tooltip={item.title}
								size="lg"
								onClick={() => {
									handleIconClick();
									setSidebar({ lastClickedMenu: item.title });
									// Only toggle submenu if sidebar is not collapsed
									if (
										item.items &&
										item.items.length > 0 &&
										state !== "collapsed"
									) {
										toggleItem(item.title);
									}
								}}
								className="cursor-pointer text-sm font-semibold transition-all duration-200 hover:bg-accent/50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-sm"
								isActive={item.isActive}
							>
								{item.icon && (
									<item.icon className="!size-6 group-data-[collapsible=icon]:!size-6" />
								)}
								{!isCollapsed && (
									<motion.span
										className="group-data-[collapsible=icon]:hidden"
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.1,
										}}
									>
										{item.title}
									</motion.span>
								)}
								{item.items && item.items.length > 0 && (
									<CaretRightIcon
										className={`ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
											isOpen ? "rotate-90" : ""
										}`}
									/>
								)}
							</SidebarMenuButton>

							{item.items && item.items.length > 0 && (
								<AnimatePresence>
									{isOpen && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2, ease: "easeInOut" }}
											className="overflow-hidden"
										>
											<SidebarMenuSub className="mt-1">
												{item.items.map((subItem) => (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton
															className="text-sm font-medium transition-all duration-100 hover:bg-accent/50 hover:text-accent-foreground data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:font-semibold px-5 py-2"
															render={
																<Link
																	to={subItem.url}
																	onClick={() =>
																		setSidebar({
																			lastClickedMenu: subItem.title,
																		})
																	}
																/>
															}
														>
															<span>{subItem.title}</span>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</motion.div>
									)}
								</AnimatePresence>
							)}
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
