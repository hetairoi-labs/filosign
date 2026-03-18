import {
	useReceivedFiles,
	useSentFiles,
	useUserProfile,
} from "@filosign/react/hooks";
import {
	FunnelIcon,
	GridFourIcon,
	ListIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { FileViewer } from "@/src/lib/components/custom/FileViewer";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Loader } from "@/src/lib/components/ui/loader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import DashboardLayout from "../../layout";
import FileCard from "./_components/FileCard";

export default function DocumentAllPage() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
	const [viewerOpen, setViewerOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<{
		pieceCid: string;
		sender: string;
		status: string;
		type?: "sent" | "received";
	} | null>(null);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const { data: userProfile } = useUserProfile();

	// File queries
	const sentFiles = useSentFiles();
	const receivedFiles = useReceivedFiles();

	// Mock data for files without metadata
	const mockMetadata = {
		fileName: "agreement.pdf",
		fileSize: 37 * 1024, // 37 KB in bytes
		fileType: "application/pdf",
	};

	const sentFilesData = Array.isArray(sentFiles.data)
		? sentFiles.data.map((file) => ({
				...file,
				type: "sent" as const,
				metadata:
					(file as { metadata?: typeof mockMetadata }).metadata || mockMetadata,
				createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
			}))
		: [];

	const receivedFilesData = Array.isArray(receivedFiles.data)
		? receivedFiles.data.map((file) => ({
				...file,
				type: "received" as const,
				metadata:
					(file as { metadata?: typeof mockMetadata }).metadata || mockMetadata,
				createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
			}))
		: [];

	const allFiles = [...sentFilesData, ...receivedFilesData];

	const handleViewModeChange = (newViewMode: "list" | "grid") => {
		if (newViewMode !== viewMode) {
			setViewMode(newViewMode);
		}
	};

	const handleItemClick = (file: {
		pieceCid: string;
		[key: string]: unknown;
	}) => {
		// Open file viewer with full file object
		setSelectedFile(
			file as {
				pieceCid: string;
				sender: string;
				status: string;
				type?: "sent" | "received";
			},
		);
		setViewerOpen(true);
	};

	return (
		<DashboardLayout>
			<div className="flex flex-col h-full rounded-tl-2xl bg-background @container">
				{/* Main Content */}
				<div className="flex flex-1 flex-col">
					{/* Header with view mode toggle */}
					<motion.div
						className="flex items-center justify-between px-8 py-4 border-b border-border"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.2 }}
					>
						<div className="flex items-center gap-4">
							<h2 className="text-lg font-medium text-foreground">
								All Documents ({allFiles.length})
							</h2>
						</div>

						<div className="flex items-center gap-4">
							<motion.div
								className="flex items-center justify-between"
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2, delay: 0.1 }}
							>
								<div className="hidden w-full max-w-2xl gap-4 @5xl:flex">
									<div className="relative">
										<MagnifyingGlassIcon className="absolute transform -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground" />
										<Input
											placeholder="Search documents..."
											className="w-64 pl-10"
											size="sm"
										/>
									</div>

									<Select>
										<SelectTrigger className="w-full min-w-40" size="sm">
											<SelectValue placeholder="Sender: All" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="me">Me</SelectItem>
											<SelectItem value="others">Others</SelectItem>
										</SelectContent>
									</Select>

									<Select>
										<SelectTrigger className="w-full min-w-40" size="sm">
											<SelectValue placeholder="All Time" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Time</SelectItem>
											<SelectItem value="today">Today</SelectItem>
											<SelectItem value="week">This Week</SelectItem>
											<SelectItem value="month">This Month</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Button
									variant={isFilterOpen ? "default" : "outline"}
									size="sm"
									className="size-8 p-0 ml-4"
									onClick={() => setIsFilterOpen(!isFilterOpen)}
								>
									<FunnelIcon className="size-4" />
								</Button>
							</motion.div>

							<div className="flex items-center gap-2 bg-card rounded-lg p-1">
								<Button
									type="button"
									variant={viewMode === "grid" ? "default" : "ghost"}
									size="sm"
									onClick={() => handleViewModeChange("grid")}
									className="h-7 w-7 p-0"
								>
									<GridFourIcon className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant={viewMode === "list" ? "default" : "ghost"}
									size="sm"
									onClick={() => handleViewModeChange("list")}
									className="h-7 w-7 p-0"
								>
									<ListIcon className="h-4 w-4" />
								</Button>
							</div>

							<Link to="/dashboard/envelope/create">
								<Button variant="primary" size="sm" className="gap-2 group">
									<PlusIcon className="size-4" weight="bold" />
									<p className="hidden sm:inline">New Document</p>
								</Button>
							</Link>
						</div>
					</motion.div>

					{/* Animated Filter Row */}
					<motion.div
						className="overflow-hidden border-b border-border"
						initial={false}
						animate={{
							height: isFilterOpen ? "auto" : 0,
							opacity: isFilterOpen ? 1 : 0,
						}}
						transition={{
							duration: 0.3,
							ease: "easeInOut",
							opacity: { duration: 0.2 },
						}}
					>
						<div className="px-8 py-4 bg-background/50 backdrop-blur-sm">
							<div className="flex flex-col gap-4 @md:flex-row @md:items-center">
								<div className="flex items-center gap-2">
									<FunnelIcon className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium text-foreground">
										Filters
									</span>
								</div>

								<div className="flex flex-col gap-3 @md:flex-row @md:gap-4 @md:flex-1">
									<Select>
										<SelectTrigger
											className="w-full @md:w-auto @md:min-w-40"
											size="sm"
										>
											<SelectValue placeholder="Sender: All" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="me">Me</SelectItem>
											<SelectItem value="others">Others</SelectItem>
										</SelectContent>
									</Select>

									<Select>
										<SelectTrigger
											className="w-full @md:w-auto @md:min-w-40"
											size="sm"
										>
											<SelectValue placeholder="All Time" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Time</SelectItem>
											<SelectItem value="today">Today</SelectItem>
											<SelectItem value="week">This Week</SelectItem>
											<SelectItem value="month">This Month</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					</motion.div>

					{/* Content */}
					<motion.div
						className="flex-1 p-8 space-y-8"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.3 }}
					>
						{sentFiles.isLoading || receivedFiles.isLoading ? (
							<Loader text="Loading documents..." className="min-h-full" />
						) : allFiles.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: 0.4 }}
									className="space-y-4 text-center"
								>
									<span className="flex items-center justify-center gap-2">
										<h1>Hi {userProfile?.firstName}!</h1>
										{userProfile?.subscriptionStatus && (
											<Badge className="uppercase">
												{userProfile?.subscriptionStatus}
											</Badge>
										)}
									</span>
									<p className="max-w-sm px-4 text-muted-foreground text-lg">
										Seems a little empty here. Try creating a new document.
									</p>
								</motion.div>
							</div>
						) : (
							<>
								{/* Sent Files Section */}
								{sentFilesData.length > 0 && (
									<motion.div
										className="space-y-4"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.2, delay: 0.4 }}
									>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
											Sent Files ({sentFilesData.length})
										</h3>
										{viewMode === "list" ? (
											<div className="space-y-2">
												{sentFilesData.map((file) => (
													<FileCard
														key={`sent-${file.pieceCid}`}
														file={file}
														onClick={handleItemClick}
														variant="list"
													/>
												))}
											</div>
										) : (
											<div className="grid grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-5 gap-4">
												{sentFilesData.map((file) => (
													<FileCard
														key={`sent-${file.pieceCid}`}
														file={file}
														onClick={handleItemClick}
														variant="grid"
													/>
												))}
											</div>
										)}
									</motion.div>
								)}

								{/* Received Files Section */}
								{receivedFilesData.length > 0 && (
									<motion.div
										className="space-y-4"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.2, delay: 0.5 }}
									>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
											Received Files ({receivedFilesData.length})
										</h3>
										{viewMode === "list" ? (
											<div className="space-y-2">
												{receivedFilesData.map((file) => (
													<FileCard
														key={`received-${file.pieceCid}`}
														file={file}
														onClick={handleItemClick}
														variant="list"
													/>
												))}
											</div>
										) : (
											<div className="grid grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-5 gap-4">
												{receivedFilesData.map((file) => (
													<FileCard
														key={`received-${file.pieceCid}`}
														file={file}
														onClick={handleItemClick}
														variant="grid"
													/>
												))}
											</div>
										)}
									</motion.div>
								)}
							</>
						)}
					</motion.div>
				</div>
			</div>
			<FileViewer
				open={viewerOpen}
				onOpenChange={setViewerOpen}
				file={selectedFile}
			/>
		</DashboardLayout>
	);
}
