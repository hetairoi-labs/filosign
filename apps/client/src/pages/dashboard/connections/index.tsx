import {
	useAcceptedPeople,
	useReceivableFrom,
	useReceivedRequests,
	useSendableTo,
} from "@filosign/react/hooks";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/custom/Logo";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";

export default function ConnectionsPage() {
	const receivedRequests = useReceivedRequests();
	const acceptedPeople = useAcceptedPeople();
	const sendableTo = useSendableTo();
	const receivableFrom = useReceivableFrom();

	// Filter requests by status
	const pendingRequests =
		receivedRequests.data?.filter((req) => req.status === "PENDING") || [];
	const acceptedRequests =
		receivedRequests.data?.filter((req) => req.status === "ACCEPTED") || [];
	const rejectedRequests =
		receivedRequests.data?.filter((req) => req.status === "REJECTED") || [];

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<motion.h3
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.1,
						}}
					>
						Connections
					</motion.h3>
				</div>
			</header>

			{/* Main Content */}
			<main className="p-8 mx-auto max-w-6xl space-y-8">
				<Button
					variant="ghost"
					size="lg"
					className="self-start mb-4"
					render={<Link to="/dashboard" />}
				>
					<CaretLeftIcon className="size-5" weight="bold" />
					<p>Back to Dashboard</p>
				</Button>

				{/* Stats Overview */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 0.1,
					}}
					className="grid grid-cols-2 md:grid-cols-5 gap-4"
				>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-[hsl(var(--secondary-medium))]">
								Pending Requests
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-[hsl(var(--secondary-medium))]">
								{pendingRequests.length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-[hsl(var(--chart-2))]">
								Accepted Connections
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-[hsl(var(--chart-2))]">
								{acceptedRequests.length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-[hsl(var(--destructive))]">
								Rejected Requests
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-[hsl(var(--destructive))]">
								{rejectedRequests.length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-[hsl(var(--chart-3))]">
								Can Send To
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-[hsl(var(--chart-3))]">
								{sendableTo.data?.length || 0}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-[hsl(var(--chart-4))]">
								Can Receive From
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-[hsl(var(--chart-4))]">
								{receivableFrom.data?.length || 0}
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Main Content Grid */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 0.2,
					}}
					className="grid gap-6 md:grid-cols-2"
				>
					{/* Pending Requests */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[hsl(var(--secondary-medium))]" />
								Pending Requests
							</CardTitle>
							<CardDescription>
								Requests from others waiting for your response
							</CardDescription>
						</CardHeader>
						<CardContent>
							{receivedRequests.isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								</div>
							) : pendingRequests.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<div className="text-sm text-muted-foreground mb-2">
										No pending requests
									</div>
									<div className="text-xs text-muted-foreground">
										Requests will appear here when others want to connect
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{pendingRequests.map((request) => (
										<div
											key={request.id}
											className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--secondary-medium)/0.3)] bg-[hsl(var(--secondary-light)/0.3)]"
										>
											<div>
												<div className="font-medium text-sm">
													{request.senderWallet.slice(0, 6)}...
													{request.senderWallet.slice(-4)}
												</div>
												{request.message && (
													<div className="text-xs text-muted-foreground mt-1">
														{request.message}
													</div>
												)}
											</div>
											<Badge
												variant="secondary"
												className="bg-[hsl(var(--secondary-light)/0.5)] text-[hsl(var(--secondary-medium))]"
											>
												Pending
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Accepted Connections */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />
								Accepted Connections
							</CardTitle>
							<CardDescription>
								People you've connected with for file sharing
							</CardDescription>
						</CardHeader>
						<CardContent>
							{acceptedPeople.isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								</div>
							) : !acceptedPeople.data?.people ||
								acceptedPeople.data.people.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<div className="text-sm text-muted-foreground mb-2">
										No accepted connections
									</div>
									<div className="text-xs text-muted-foreground">
										Accepted connections will appear here
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{acceptedPeople.data.people.map((person, index) => (
										<div
											key={person.walletAddress || index}
											className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--chart-2)/0.3)] bg-[hsl(var(--chart-2)/0.1)]"
										>
											<div>
												<div className="font-medium text-sm">
													{person.displayName ||
														`${person.walletAddress?.slice(0, 6)}...${person.walletAddress?.slice(-4)}`}
												</div>
												{person.username && (
													<div className="text-xs text-muted-foreground">
														@{person.username}
													</div>
												)}
											</div>
											<Badge
												variant="secondary"
												className="bg-[hsl(var(--chart-2)/0.2)] text-[hsl(var(--chart-2))]"
											>
												Connected
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Rejected Requests */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[hsl(var(--destructive))]" />
								Rejected Requests
							</CardTitle>
							<CardDescription>Requests you've declined</CardDescription>
						</CardHeader>
						<CardContent>
							{receivedRequests.isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								</div>
							) : rejectedRequests.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<div className="text-sm text-muted-foreground mb-2">
										No rejected requests
									</div>
									<div className="text-xs text-muted-foreground">
										Rejected requests will appear here
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{rejectedRequests.map((request) => (
										<div
											key={request.id}
											className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.1)]"
										>
											<div>
												<div className="font-medium text-sm">
													{request.senderWallet.slice(0, 6)}...
													{request.senderWallet.slice(-4)}
												</div>
												{request.message && (
													<div className="text-xs text-muted-foreground mt-1">
														{request.message}
													</div>
												)}
											</div>
											<Badge
												variant="secondary"
												className="bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]"
											>
												Rejected
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* People I Can Send To */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-3))]" />
								Can Send To
							</CardTitle>
							<CardDescription>
								People who have approved you to send files
							</CardDescription>
						</CardHeader>
						<CardContent>
							{sendableTo.isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								</div>
							) : !sendableTo.data || sendableTo.data.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<div className="text-sm text-muted-foreground mb-2">
										No send permissions
									</div>
									<div className="text-xs text-muted-foreground">
										Request permissions from others to send files
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{sendableTo.data.map((approval, index) => (
										<div
											key={approval.recipientWallet || index}
											className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--chart-3)/0.3)] bg-[hsl(var(--chart-3)/0.1)]"
										>
											<div>
												<div className="font-medium text-sm">
													{approval.recipientWallet.slice(0, 6)}...
													{approval.recipientWallet.slice(-4)}
												</div>
												<div className="text-xs text-muted-foreground">
													Approved:{" "}
													{new Date(approval.createdAt).toLocaleDateString()}
												</div>
											</div>
											<Badge
												variant="secondary"
												className="bg-[hsl(var(--chart-3)/0.2)] text-[hsl(var(--chart-3))]"
											>
												Can Send
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* People I Can Receive From */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]" />
								Can Receive From
							</CardTitle>
							<CardDescription>
								People who can send files to you
							</CardDescription>
						</CardHeader>
						<CardContent>
							{receivableFrom.isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								</div>
							) : !receivableFrom.data || receivableFrom.data.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<div className="text-sm text-muted-foreground mb-2">
										No receive permissions
									</div>
									<div className="text-xs text-muted-foreground">
										Others need to request permission to send you files
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{receivableFrom.data.map((approval, index) => (
										<div
											key={approval.senderWallet || index}
											className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--chart-4)/0.3)] bg-[hsl(var(--chart-4)/0.1)]"
										>
											<div>
												<div className="font-medium text-sm">
													{approval.senderWallet.slice(0, 6)}...
													{approval.senderWallet.slice(-4)}
												</div>
												<div className="text-xs text-muted-foreground">
													Approved:{" "}
													{new Date(approval.createdAt).toLocaleDateString()}
												</div>
											</div>
											<Badge
												variant="secondary"
												className="bg-[hsl(var(--chart-4)/0.2)] text-[hsl(var(--chart-4))]"
											>
												Can Receive
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</main>
		</div>
	);
}
