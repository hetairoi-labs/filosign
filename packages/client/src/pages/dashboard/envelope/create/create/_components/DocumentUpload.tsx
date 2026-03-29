import {
	CaretDownIcon,
	GridFourIcon,
	ListIcon,
	PaperPlaneTiltIcon,
	UploadIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import type {
	Control,
	FieldArrayWithId,
	UseFieldArrayAppend,
	UseFieldArrayRemove,
} from "react-hook-form";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { FormField, FormItem, FormMessage } from "@/src/lib/components/ui/form";
import { cn } from "@/src/lib/utils/utils";
import type { AllowedFileMime, EnvelopeForm, UploadedFile } from "../../types";
import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_MIME_SET } from "../../types";
import FileCard from "./FileCard";

interface DocumentsSectionProps {
	control: Control<EnvelopeForm>;
	fields: FieldArrayWithId<EnvelopeForm, "documents", "id">[];
	append: UseFieldArrayAppend<EnvelopeForm, "documents">;
	remove: UseFieldArrayRemove;
}

export default function DocumentsSection({
	control,
	fields,
	append,
	remove,
}: DocumentsSectionProps) {
	const [isDocumentsOpen, setIsDocumentsOpen] = useState(true);
	const [isDragOver, setIsDragOver] = useState(false);
	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
	const [isViewSwitching, setIsViewSwitching] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
	const [oversizedFiles, setOversizedFiles] = useState<string[]>([]);

	const MAX_FILE_SIZE = 10 * 1024 * 1024;

	const handleFileSelect = useCallback(
		(files: FileList | null) => {
			if (!files) return;

			const incoming = Array.from(files);
			const rejected = incoming
				.filter(
					(file) => !ACCEPTED_FILE_MIME_SET.has(file.type as AllowedFileMime),
				)
				.map((file) => file.name);

			const oversized = incoming
				.filter((file) => file.size > MAX_FILE_SIZE)
				.map((file) => file.name);

			const newFiles: UploadedFile[] = incoming
				.filter(
					(file) =>
						ACCEPTED_FILE_MIME_SET.has(file.type as AllowedFileMime) &&
						file.size <= MAX_FILE_SIZE,
				)
				.map((file) => ({
					id: Math.random().toString(36).substr(2, 9),
					file,
					name: file.name,
					size: file.size,
					type: file.type,
				}))
				.filter((newFile) => {
					return !fields.some(
						(existingFile) =>
							existingFile.name === newFile.name &&
							existingFile.size === newFile.size,
					);
				});

			for (const file of newFiles) {
				append(file);
			}
			setUnsupportedFiles(rejected);
			setOversizedFiles(oversized);
		},
		[fields, append],
	);

	const handleFileInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		handleFileSelect(event.target.files);
		// Reset the input value so the same file can be selected again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
		handleFileSelect(event.dataTransfer.files);
	};

	const removeFile = (fileId: string) => {
		const index = fields.findIndex((file) => file.id === fileId);
		if (index !== -1) {
			remove(index);
		}
	};

	const handleViewModeChange = (newViewMode: "list" | "grid") => {
		if (newViewMode !== viewMode) {
			setIsViewSwitching(true);
			setViewMode(newViewMode);
			// Reset the switching state after animation completes
			setTimeout(() => {
				setIsViewSwitching(false);
			}, 300);
		}
	};

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.2,
			}}
		>
			<Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
				<CollapsibleTrigger asChild>
					<div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors p-2 -m-2 rounded-md group/add-docs">
						<h4 className="flex items-center gap-3">
							<PaperPlaneTiltIcon
								className={cn(
									"size-5 text-muted-foreground group-hover/add-docs:rotate-45 transition-transform duration-200",
									isDocumentsOpen && "rotate-45",
								)}
							/>
							Add files
						</h4>
						<CaretDownIcon
							className={cn(
								"size-4 text-muted-foreground transition-transform duration-200",
								isDocumentsOpen && "rotate-180",
							)}
							weight="bold"
						/>
					</div>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<FormField
						control={control}
						name="documents"
						rules={{
							validate: (value) => {
								if (!value || value.length === 0) {
									return "At least 1 file is required";
								}
								return true;
							},
						}}
						render={() => (
							<FormItem>
								{/* Hidden file input */}
								<input
									ref={fileInputRef}
									type="file"
									multiple
									onChange={handleFileInputChange}
									className="hidden"
									accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
								/>

								<motion.div
									className={cn(
										"border-2 border-primary/20 rounded-lg p-16 text-center transition-colors bg-muted/5",
										isDragOver
											? "border-primary bg-primary/5"
											: "hover:border-muted-foreground/50",
									)}
									transition={{ duration: 0.2 }}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
								>
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.1,
										}}
										className="space-y-6"
									>
										<motion.div
											className="flex justify-center"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{
												type: "spring",
												stiffness: 230,
												damping: 25,
												delay: 0.2,
											}}
										>
											<motion.div
												className="p-6 rounded-full bg-muted/20"
												transition={{
													type: "spring",
													stiffness: 230,
													damping: 25,
													duration: 0.3,
												}}
											>
												<UploadIcon className="h-12 w-12 text-primary" />
											</motion.div>
										</motion.div>
										<motion.div
											className="space-y-4"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												type: "spring",
												stiffness: 230,
												damping: 25,
												delay: 0.3,
											}}
										>
											<p className="text-muted-foreground">
												{isDragOver
													? "Drop your files here"
													: "Drop your files here or"}
											</p>
											<Button
												type="button"
												variant="primary"
												size="lg"
												className="gap-2 px-6 py-3"
												onClick={handleUploadClick}
											>
												Upload
											</Button>
										</motion.div>
									</motion.div>
								</motion.div>

								{/* Unsupported files error */}
								{unsupportedFiles.length > 0 && (
									<p className="mt-2 text-sm text-destructive font-medium">
										Unsupported files: {unsupportedFiles.join(", ")}
									</p>
								)}

								{/* Oversized files error */}
								{oversizedFiles.length > 0 && (
									<p className="mt-2 text-sm text-destructive font-medium">
										Files too large (max 10MB): {oversizedFiles.join(", ")}
									</p>
								)}

								{/* Uploaded Files Display */}
								{fields.length > 0 && (
									<motion.div
										className="mt-4 space-y-4"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.1,
										}}
									>
										{/* Header with view mode toggle */}
										<div className="flex items-center justify-between">
											<h5 className="text-sm font-medium text-muted-foreground">
												Uploaded Files ({fields.length})
											</h5>
											<div className="flex items-center gap-1 bg-muted/20 rounded-lg p-1">
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
										</div>

										{/* Files display */}
										{viewMode === "list" ? (
											<div className="space-y-2">
												{fields.map((file) => (
													<FileCard
														key={file.id}
														file={file}
														onRemove={removeFile}
														variant="list"
														delayPreview={isViewSwitching}
													/>
												))}
											</div>
										) : (
											<div className="max-h-96 overflow-auto">
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
													{fields.map((file) => (
														<FileCard
															key={file.id}
															file={file}
															onRemove={removeFile}
															variant="grid"
															delayPreview={isViewSwitching}
														/>
													))}
												</div>
											</div>
										)}
									</motion.div>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}
