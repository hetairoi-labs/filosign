import { memo } from "react";

interface SuccessCheckmarkProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export const SuccessCheckmark = memo(function SuccessCheckmark({
	size = "md",
	className = "",
}: SuccessCheckmarkProps) {
	const sizeClasses = {
		sm: "size-4",
		md: "size-6",
		lg: "size-8",
	};

	return (
		<span
			className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}
			aria-hidden="true"
		>
			<svg
				className="animate-success-draw"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Success</title>
				<circle
					cx="12"
					cy="12"
					r="10"
					className="stroke-success"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					pathLength="1"
					style={
						{
							strokeDasharray: 1,
							strokeDashoffset: 1,
							animation:
								"success-circle 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards",
						} as React.CSSProperties
					}
				/>
				<path
					d="M8 12L11 15L16 9"
					className="stroke-success"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					pathLength="1"
					style={
						{
							strokeDasharray: 1,
							strokeDashoffset: 1,
							animation:
								"success-check 0.3s cubic-bezier(0.25, 1, 0.5, 1) 0.25s forwards",
						} as React.CSSProperties
					}
				/>
			</svg>
		</span>
	);
});
