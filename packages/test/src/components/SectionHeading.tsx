interface SectionHeadingProps {
	title: string;
	className?: string;
	id: string;
}

export function SectionHeading({
	title,
	className = "bg-secondary",
	id,
}: SectionHeadingProps) {
	return (
		<h2 id={id} className="text-lg font-semibold flex items-center gap-2">
			<span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
			{title}
		</h2>
	);
}
