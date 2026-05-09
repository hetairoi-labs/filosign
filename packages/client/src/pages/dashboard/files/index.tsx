import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { FileViewer } from "@/src/lib/components/custom/FileViewer";
import DashboardLayout from "../layout";
import Card from "./_components/Card";
import { type FileOrFolder, initialFilesAndFolders } from "./_components/data";
import Header from "./_components/Header";

export default function DashboardPage() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortCriteria, setSortCriteria] = useState("name");
	const [viewerOpen, setViewerOpen] = useState(false);
	const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

	const filteredAndSortedItems = useMemo(() => {
		return initialFilesAndFolders
			.filter((item) =>
				item.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
			.sort((a, b) => {
				if (sortCriteria === "name") {
					return a.name.localeCompare(b.name);
				}
				if (sortCriteria === "lastModified") {
					return (b.lastModified || "").localeCompare(a.lastModified || "");
				}
				return 0;
			});
	}, [searchQuery, sortCriteria]);

	const folders = filteredAndSortedItems.filter(
		(item) => item.type === "folder",
	);
	const files = filteredAndSortedItems.filter((item) => item.type === "file");

	const handleItemClick = (item: FileOrFolder) => {
		if (item.type === "file") {
			setSelectedFileId(item.id);
			setViewerOpen(true);
		}
		// For folders, we could navigate to a folder view, but for now we'll just ignore
	};

	return (
		<DashboardLayout>
			<div className="p-8">
				<Header
					onSearch={setSearchQuery}
					onSort={setSortCriteria}
					onViewChange={setViewMode}
					currentView={viewMode}
				/>

				<motion.div layout>
					<AnimatePresence>
						{folders.length > 0 && (
							<motion.section
								layout
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="mb-12"
							>
								<h2 className="text-xl font-bold mb-4">Folders</h2>
								<div
									className={`grid ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"} gap-4`}
								>
									{folders.map((item) => (
										<Card
											key={item.id}
											item={item}
											viewMode={viewMode}
											onClick={handleItemClick}
										/>
									))}
								</div>
							</motion.section>
						)}

						{files.length > 0 && (
							<motion.section
								layout
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								<h2 className="text-xl font-bold mb-4">Files</h2>
								<div
									className={`grid ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"} gap-4`}
								>
									{files.map((item) => (
										<Card
											key={item.id}
											item={item}
											viewMode={viewMode}
											onClick={handleItemClick}
										/>
									))}
								</div>
							</motion.section>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
			<FileViewer
				open={viewerOpen}
				onOpenChange={setViewerOpen}
				file={
					selectedFileId
						? {
								pieceCid: selectedFileId,
								sender: "",
								status: "s3",
							}
						: null
				}
			/>
		</DashboardLayout>
	);
}
