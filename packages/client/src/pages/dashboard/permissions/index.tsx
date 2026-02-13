import {
	useApproveSender,
	useCancelRequest,
	useReceivableFrom,
	useReceivedRequests,
	useSendableTo,
	useSentRequests,
} from "@filosign/react/hooks";
import {
	ArrowClockwiseIcon,
	CaretLeftIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
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

export default function PermissionsPage() {
	const _queryClient = useQueryClient();

	// Fetch all permission-related data
	const sentRequests = useSentRequests();
	const receivedRequests = useReceivedRequests();
	const allowedSenders = useSendableTo();
	const allowedReceivers = useReceivableFrom();

	// Mutations for managing permissions
	const _allowSharing = useApproveSender();
	const cancelRequest = useCancelRequest();

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const getStatusBadge = (status: string) => {
		switch (status.toLowerCase()) {
			case "PENDING":
				return (
					<Badge
						variant="secondary"
						className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
					>
						<ClockIcon className="w-3 h-3 mr-1" />
						Pending
					</Badge>
				);
			case "ACCEPTED":
			case "ALLOWED":
				return (
					<Badge
						variant="secondary"
						className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
					>
						<CheckCircleIcon className="w-3 h-3 mr-1" />
						Allowed
					</Badge>
				);
			case "REJECTED":
			case "DENIED":
				return (
					<Badge
						variant="secondary"
						className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
					>
						<XCircleIcon className="w-3 h-3 mr-1" />
						Rejected
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const handleRefresh = () => {
		sentRequests.refetch();
		receivedRequests.refetch();
		allowedSenders.refetch();
		allowedReceivers.refetch();
		toast.success("Permissions refreshed");
	};

	const handleCancelRequest = async (requestId: string) => {
		try {
			await cancelRequest.mutateAsync(requestId);
			toast.success("Request cancelled");
		} catch (_error) {
			toast.error("Failed to cancel request");
		}
	};

	// Categorize requests
	const receivedRequestsData = receivedRequests.data || [];
	const pendingRequests = Array.isArray(receivedRequestsData)
		? receivedRequestsData.filter(
				(req: any) => req.status === "PENDING" || req.status === "pending",
			)
		: [];
	const _allowedRequests = Array.isArray(receivedRequestsData)
		? receivedRequestsData.filter(
				(req: any) =>
					req.status === "ACCEPTED" ||
					req.status === "ALLOWED" ||
					req.status === "accepted" ||
					req.status === "allowed",
			)
		: [];
	const _rejectedRequests = Array.isArray(receivedRequestsData)
		? receivedRequestsData.filter(
				(req: any) =>
					req.status === "REJECTED" ||
					req.status === "DENIED" ||
					req.status === "rejected" ||
					req.status === "denied",
			)
		: [];

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
						Permissions & Access
					</motion.h3>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRefresh}
					disabled={
						sentRequests.isFetching ||
						receivedRequests.isFetching ||
						allowedSenders.isFetching ||
						allowedReceivers.isFetching
					}
				>
					<ArrowClockwiseIcon
						className={`w-4 h-4 mr-2 ${sentRequests.isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</header>

			{/* Main Content */}
			<main className="p-8 mx-auto max-w-6xl space-y-8">
				<Button variant="ghost" size="lg" className="self-start mb-4" asChild>
					<Link to="/dashboard">
						<CaretLeftIcon className="size-5" weight="bold" />
						<p>Back to Dashboard</p>
					</Link>
				</Button>

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
								<ClockIcon className="h-5 w-5 text-yellow-600" />
								Pending Requests
							</CardTitle>
							<CardDescription>
								Requests waiting for your approval
							</CardDescription>
						</CardHeader>
						<CardContent>
							{pendingRequests.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">No pending requests</p>
								</div>
							) : (
								<div className="space-y-3">
									{pendingRequests.map((req: any, i: number) => (
										<div
											key={i}
											className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
										>
											<div>
												<div className="font-medium text-sm">
													{formatAddress(req.senderWallet)}
												</div>
												{req.message && (
													<div className="text-xs text-muted-foreground mt-1">
														"{req.message}"
													</div>
												)}
											</div>
											{getStatusBadge(req.status)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* People You Can Send To */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CheckCircleIcon className="h-5 w-5 text-green-600" />
								People You Can Send To
							</CardTitle>
							<CardDescription>
								Recipients who have accepted your sharing requests
							</CardDescription>
						</CardHeader>
						<CardContent>
							{allowedSenders.isLoading ? (
								<div className="text-center py-8">
									<ArrowClockwiseIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">Loading...</p>
								</div>
							) : !allowedSenders.data || allowedSenders.data.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<CheckCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">
										No one has accepted your requests yet
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{allowedSenders.data
										.filter((approval: any) => approval.active)
										.map((approval: any, i: number) => (
											<div
												key={i}
												className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
											>
												<div className="flex items-center gap-3">
													<div className="flex-shrink-0">
														<div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
															<span className="text-xs font-medium text-green-700 dark:text-green-300">
																{formatAddress(
																	approval.recipientWallet,
																)[2].toUpperCase()}
															</span>
														</div>
													</div>
													<div>
														<div className="font-medium text-sm">
															{formatAddress(approval.recipientWallet)}
														</div>
														<div className="text-xs text-muted-foreground">
															Approved{" "}
															{new Date(
																approval.createdAt,
															).toLocaleDateString()}
														</div>
													</div>
												</div>
												<Badge
													variant="secondary"
													className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
												>
													Can Send To
												</Badge>
											</div>
										))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Sent Requests */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ArrowClockwiseIcon className="h-5 w-5 text-blue-600" />
								Your Requests
							</CardTitle>
							<CardDescription>Requests you've sent to others</CardDescription>
						</CardHeader>
						<CardContent>
							{sentRequests.isLoading ? (
								<div className="text-center py-8">
									<ArrowClockwiseIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">Loading...</p>
								</div>
							) : !sentRequests.data || sentRequests.data.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<ArrowClockwiseIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">No requests sent</p>
								</div>
							) : (
								<div className="space-y-3">
									{sentRequests.data.map((req: any, i: number) => (
										<div
											key={i}
											className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
										>
											<div>
												<div className="font-medium text-sm">
													To: {formatAddress(req.recipientWallet)}
												</div>
												{req.message && (
													<div className="text-xs text-muted-foreground mt-1">
														"{req.message}"
													</div>
												)}
											</div>
											<div className="flex items-center gap-2">
												{getStatusBadge(req.status)}
												{req.status === "PENDING" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleCancelRequest(req.id)}
														disabled={cancelRequest.isPending}
														className="h-6 w-6 p-0 text-destructive hover:text-destructive"
													>
														<XCircleIcon className="h-3 w-3" />
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Can Receive From */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CheckCircleIcon className="h-5 w-5 text-purple-600" />
								Can Receive From
							</CardTitle>
							<CardDescription>
								People who can send you documents
							</CardDescription>
						</CardHeader>
						<CardContent>
							{allowedReceivers.isLoading ? (
								<div className="text-center py-8">
									<ArrowClockwiseIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">Loading...</p>
								</div>
							) : !allowedReceivers.data ||
								allowedReceivers.data.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<CheckCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">No one can send to you yet</p>
								</div>
							) : (
								<div className="space-y-3">
									{allowedReceivers.data
										.filter((approval: any) => approval.active)
										.map((approval: any, i: number) => (
											<div
												key={i}
												className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
											>
												<div className="flex items-center gap-3">
													<div className="flex-shrink-0">
														<div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
															<span className="text-xs font-medium text-purple-700 dark:text-purple-300">
																{formatAddress(
																	approval.senderWallet,
																)[2].toUpperCase()}
															</span>
														</div>
													</div>
													<div>
														<div className="font-medium text-sm">
															{formatAddress(approval.senderWallet)}
														</div>
														<div className="text-xs text-muted-foreground">
															Approved{" "}
															{new Date(
																approval.createdAt,
															).toLocaleDateString()}
														</div>
													</div>
												</div>
												<Badge variant="outline" className="text-xs">
													Active
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
