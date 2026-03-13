import type React from "react";
import { twMerge } from "tailwind-merge";

interface Mutation<TArgs = void> {
	mutate: TArgs extends void ? () => void : (args: TArgs) => void;
	isPending: boolean;
	isError: boolean;
	isSuccess: boolean;
	error: Error | null;
}

interface ButtonProps<TArgs = void> {
	mutation: Mutation<TArgs>;
	mutationArgs?: TArgs extends void ? never : TArgs;
	children: React.ReactNode;
	className?: string;
}

const Button = <TArgs = void>({
	mutation,
	mutationArgs,
	children,
	className = "",
}: ButtonProps<TArgs>) => {
	const { mutate, isPending, isError, isSuccess } = mutation;

	const handleClick = () => {
		if (!isPending) {
			if (mutationArgs !== undefined) {
				(mutate as (args: TArgs) => void)(mutationArgs);
			} else {
				(mutate as () => void)();
			}
		}
	};

	const baseClasses =
		"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]";

	const getButtonClasses = () => {
		const stateClasses = isPending
			? "bg-muted text-muted-foreground cursor-not-allowed"
			: isError
				? "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20"
				: isSuccess
					? "bg-success text-success-foreground shadow-xs hover:bg-success/90"
					: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90";

		return twMerge(baseClasses, stateClasses, className);
	};

	const getButtonText = () => {
		if (isPending) return "Loading...";
		if (isError) return "Retry";
		if (isSuccess) return "Success!";
		return children;
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isPending}
			className={getButtonClasses()}
		>
			{getButtonText()}
		</button>
	);
};

export default Button;
