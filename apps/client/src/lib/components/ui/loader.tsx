import { SpinnerBallIcon } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils/utils";

interface LoaderProps {
	text?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Loader({
	text = "Working on it...",
	size = "md",
	className,
}: LoaderProps) {
	const sizeClasses = {
		sm: "size-4",
		md: "size-8",
		lg: "size-12",
	};

	return (
		<div
			className={cn(
				"flex items-center justify-center min-h-screen gap-2",
				className,
			)}
		>
			<SpinnerBallIcon className={cn("animate-spin", sizeClasses[size])} />
			<h3 className="text-foreground">{text}</h3>
		</div>
	);
}
