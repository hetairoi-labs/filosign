import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";

interface SaveButtonProps {
	onSave: () => void;
	disabled: boolean;
	isLoading: boolean;
	isSaved: boolean;
	error?: string;
	show: boolean;
}

export function SaveButton({
	onSave,
	disabled,
	isLoading,
	isSaved,
	error,
	show,
}: SaveButtonProps) {
	if (!show) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 10 }}
			transition={{ duration: 0.2 }}
			className="flex justify-end gap-2"
		>
			{error && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex items-center gap-2 text-destructive text-sm"
				>
					<WarningIcon className="size-4" />
					{error}
				</motion.div>
			)}
			<Button
				variant="primary"
				size="sm"
				onClick={onSave}
				disabled={disabled || isLoading}
			>
				{isLoading ? (
					"Saving..."
				) : isSaved ? (
					<span className="flex gap-2 items-center">
						<CheckIcon className="size-4" />
						Saved
					</span>
				) : (
					"Save Changes"
				)}
			</Button>
		</motion.div>
	);
}
