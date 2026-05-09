import { SidebarInset, SidebarProvider } from "@/src/lib/components/ui/sidebar";
import { DashboardSidebar } from "@/src/pages/dashboard/_components/sidebar/dashboard-sidebar";
import DashboardNav from "./_components/dashboard-nav";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<DashboardSidebar className="bg-card/80" />
			<SidebarInset>
				<DashboardNav />
				<section id="dashboard-content" className="flex flex-1 flex-col gap-4">
					{children}
				</section>
			</SidebarInset>
		</SidebarProvider>
	);
}
