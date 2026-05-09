import Logo from "@/src/lib/components/custom/Logo";
import { NotificationsPopover } from "./notifications-popover";
import { UserDropdown } from "./user-dropdown";

export default function DashboardNav() {
	return (
		<nav className="sticky top-0 bg-background/80 glass flex h-16 justify-between shrink-0 items-center gap-2 px-8 z-50 border-b">
			<div className="flex gap-2 items-center">
				<Logo
					textDelay={0.35}
					iconDelay={0.26}
					className="px-0"
					textClassName="text-foreground font-semibold"
				/>
			</div>

			<div className="flex gap-4 items-center">
				<NotificationsPopover />
				<UserDropdown />
			</div>
		</nav>
	);
}
