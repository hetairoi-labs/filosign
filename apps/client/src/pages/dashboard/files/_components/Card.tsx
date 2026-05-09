import { DotsThreeVertical } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import type { FileOrFolder } from "./data";
import { fileTypeIcons } from "./data";

interface CardProps {
	item: FileOrFolder;
	viewMode: "grid" | "list";
	onClick?: (item: FileOrFolder) => void;
}

function Card({ item, viewMode, onClick }: CardProps) {
	const Icon =
		item.type === "folder"
			? fileTypeIcons.folder
			: fileTypeIcons[item.fileType || "other"];

	if (viewMode === "list") {
		return (
			<motion.div
				layout
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="flex items-center justify-between p-3 bg-card/50 hover:bg-card rounded-lg transition-colors w-full cursor-pointer"
				onClick={() => onClick?.(item)}
			>
				<div className="flex items-center gap-4">
					<Icon className="size-6 text-muted-foreground" />
					<span className="font-medium">{item.name}</span>
				</div>
				<div className="flex items-center gap-8">
					<span className="text-sm text-muted-foreground">
						{item.lastModified}
					</span>
					<Button variant="ghost" size="icon" className="size-8">
						<DotsThreeVertical className="size-5" />
					</Button>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			className="group/card rounded-lg border bg-card/30 hover:bg-card/90 hover:border-primary/20 transition-all cursor-pointer flex flex-col"
			onClick={() => onClick?.(item)}
		>
			<div className="p-4 flex-grow">
				<div className="flex items-center justify-between mb-4">
					<Icon className="size-7 text-primary" />
					<Button
						variant="ghost"
						size="icon"
						className="size-8 opacity-0 group-hover/card:opacity-100 transition-opacity"
					>
						<DotsThreeVertical className="size-5 text-muted-foreground" />
					</Button>
				</div>
			</div>
			<div className="bg-background/80 p-4 border-t rounded-b-lg">
				<p className="font-semibold text-sm truncate">{item.name}</p>
				{item.lastModified && (
					<p className="text-xs text-muted-foreground mt-1">
						Modified: {item.lastModified}
					</p>
				)}
			</div>
		</motion.div>
	);
}

export default Card;
