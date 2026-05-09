import {
	FunnelIcon,
	MagnifyingGlassIcon,
	RowsIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { Input } from "@/src/lib/components/ui/input";

interface HeaderProps {
	onSearch: (query: string) => void;
	onSort: (criteria: string) => void;
	onViewChange: (mode: "grid" | "list") => void;
	currentView: "grid" | "list";
}

function Header({ onSearch, onSort, onViewChange, currentView }: HeaderProps) {
	return (
		<motion.div
			initial={{ y: -20, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8"
		>
			<div className="relative w-full md:w-auto flex-grow">
				<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
				<Input
					placeholder="Search files..."
					className="pl-10"
					onChange={(e) => onSearch(e.target.value)}
				/>
			</div>
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button variant="outline" className="gap-2" />}
					>
						Sort By <CaretDown />
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem onClick={() => onSort("name")}>
							Name
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onSort("lastModified")}>
							Last Modified
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button variant="outline" className="gap-2">
					<FunnelIcon /> Filters
				</Button>

				<div className="flex items-center gap-1 bg-muted/20 rounded-lg p-1">
					<Button
						type="button"
						variant={currentView === "grid" ? "default" : "ghost"}
						size="sm"
						onClick={() => onViewChange("grid")}
						className="h-8 w-8 p-0"
					>
						<SquaresFourIcon className="h-5 w-5" />
					</Button>
					<Button
						type="button"
						variant={currentView === "list" ? "default" : "ghost"}
						size="sm"
						onClick={() => onViewChange("list")}
						className="h-8 w-8 p-0"
					>
						<RowsIcon className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</motion.div>
	);
}

export default Header;
