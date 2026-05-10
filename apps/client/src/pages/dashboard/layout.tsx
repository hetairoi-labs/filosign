import DashboardNav from "./_components/dashboard-nav";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-svh w-full flex-col">
			<DashboardNav />
			<section
				id="dashboard-content"
				className="flex flex-1 flex-col gap-4 h-full"
			>
				{children}
			</section>
		</div>
	);
}
