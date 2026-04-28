import { useFilosignContext } from "@filosign/react";
import { useRequestApproval } from "@filosign/react/hooks";
import {
	ChatCircleIcon,
	EnvelopeIcon,
	PlusIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { getAddress, isAddress } from "viem";
import { safeAsync } from "@/lib/utils/safe";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

interface AddRecipientDialogProps {
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export default function AddRecipientDialog({
	trigger,
	onSuccess,
}: AddRecipientDialogProps) {
	const [open, setOpen] = useState(false);
	const [walletAddress, setWalletAddress] = useState("");
	const [recipientEmail, setRecipientEmail] = useState("");
	const [message, setMessage] = useState("");

	const { wallet } = useFilosignContext();
	const sendShareRequest = useRequestApproval();

	const handleSendRequest = async () => {
		if (!isAddress(walletAddress)) {
			toast.error("Please enter a valid wallet address");
			return;
		}

		if (
			recipientEmail.trim() &&
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())
		) {
			toast.error("Please enter a valid email address");
			return;
		}

		// Normalize addresses for comparison
		const normalizedRecipient = getAddress(walletAddress);
		const normalizedSender = wallet?.account?.address
			? getAddress(wallet.account.address)
			: null;

		if (normalizedSender && normalizedRecipient === normalizedSender) {
			toast.error("You cannot add yourself as a recipient");
			return;
		}

		const [result, error] = await safeAsync(
			sendShareRequest.mutateAsync({
				recipientWallet: walletAddress,
				recipientEmail: recipientEmail.trim() || undefined,
				message: message.trim() || undefined,
			}),
		);

		if (error) {
			console.error(error);
			toast.error(
				error.message || "Failed to send share request. Please try again.",
			);
			return;
		}

		if (recipientEmail.trim()) {
			const emailSent =
				result && typeof result === "object" && "emailSent" in result
					? result.emailSent
					: false;
			const emailError =
				result && typeof result === "object" && "emailError" in result
					? result.emailError
					: undefined;

			if (emailSent) {
				toast.success("Share request sent and email notification delivered.");
			} else {
				toast.warning(
					emailError
						? `Share request sent, but email failed: ${emailError}`
						: "Share request sent, but email notification was not delivered.",
				);
			}
		} else {
			toast.success("Share request sent successfully!");
		}
		setWalletAddress("");
		setRecipientEmail("");
		setMessage("");
		setOpen(false);
		onSuccess?.();
	};

	const handleClose = () => {
		setWalletAddress("");
		setRecipientEmail("");
		setMessage("");
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="primary" size="sm">
						<PlusIcon className="w-4 h-4 mr-2" />
						Add Recipient
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add New Recipient</DialogTitle>
					<DialogDescription>
						Send a share request to allow someone to receive documents from you.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Wallet Address Input */}
					<div className="space-y-2">
						<Label htmlFor="wallet-address" className="flex items-center gap-2">
							<WalletIcon className="w-4 h-4" />
							Wallet Address *
						</Label>
						<Input
							id="wallet-address"
							name="wallet-address"
							placeholder="0x..."
							value={walletAddress}
							onChange={(e) => setWalletAddress(e.target.value)}
							className="font-mono"
							autoComplete="off"
						/>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="recipient-email"
							className="flex items-center gap-2"
						>
							<EnvelopeIcon className="w-4 h-4" />
							Notification Email (Optional)
						</Label>
						<Input
							id="recipient-email"
							name="recipient-email"
							type="email"
							placeholder="recipient@example.com"
							value={recipientEmail}
							onChange={(e) => setRecipientEmail(e.target.value)}
							autoComplete="email"
						/>
						<p className="text-xs text-muted-foreground">
							We'll email this address so they can log in with the wallet above
							and review the request.
						</p>
					</div>

					{/* Message Input */}
					<div className="space-y-2">
						<Label htmlFor="message" className="flex items-center gap-2">
							<ChatCircleIcon className="w-4 h-4" />
							Message (Optional)
						</Label>
						<Textarea
							id="message"
							placeholder="Add a personal message with your share request..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-3">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSendRequest}
						disabled={sendShareRequest.isPending || !walletAddress.trim()}
						variant="primary"
					>
						{sendShareRequest.isPending ? "Sending..." : "Send Request"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
