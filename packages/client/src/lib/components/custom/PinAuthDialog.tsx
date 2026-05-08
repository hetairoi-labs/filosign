import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import OtpInput from "@/src/pages/onboarding/_components/OtpInput";

interface PinAuthDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (pin: string) => Promise<void>;
	isLoading?: boolean;
}

export default function PinAuthDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading = false,
}: PinAuthDialogProps) {
	const [pin, setPin] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async () => {
		if (pin.length !== 6) return;

		try {
			setError("");
			await onSubmit(pin);
			setPin("");
			onOpenChange(false);
		} catch (error) {
			console.error("PIN authentication failed:", error);
			setError("Invalid PIN. Please try again.");
			setPin("");
			toast.error("Invalid PIN. Please try again.");
		}
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setPin("");
			setError("");
		}
		onOpenChange(newOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Enter your PIN</DialogTitle>
					<DialogDescription>
						Please enter your PIN (6-10 digits) to access your account.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex flex-col gap-2">
						<OtpInput
							value={pin}
							onChange={setPin}
							length={6}
							autoFocus={true}
							onSubmit={handleSubmit}
							disabled={isLoading}
						/>
					</div>

					{error && (
						<p className="text-destructive text-sm text-center">{error}</p>
					)}

					<div className="flex gap-3">
						<Button
							variant="ghost"
							onClick={() => handleOpenChange(false)}
							className="flex-1"
							disabled={isLoading}
						>
							Cancel
						</Button>

						<Button
							onClick={handleSubmit}
							disabled={pin.length !== 6 || isLoading}
							className="flex-1 group"
							variant="primary"
						>
							{isLoading ? "Authenticating..." : "Continue"}
							{!isLoading && (
								<CaretRightIcon
									className="transition-transform duration-200 size-4 group-hover:translate-x-1"
									weight="bold"
								/>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
