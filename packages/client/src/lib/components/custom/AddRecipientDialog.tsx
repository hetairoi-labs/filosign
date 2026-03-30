import { useFilosignContext } from "@filosign/react";
import { useRequestApproval } from "@filosign/react/hooks";
import { ChatCircleIcon, PlusIcon, WalletIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { safeAsync } from "@/lib/utils/safe";
import { getAddress, isAddress } from "viem";
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
	const [message, setMessage] = useState("");

	const { wallet } = useFilosignContext();
	const sendShareRequest = useRequestApproval();

	const handleSendRequest = async () => {
		if (!isAddress(walletAddress)) {
			toast.error("Please enter a valid wallet address");
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

		const [, error] = await safeAsync(
			sendShareRequest.mutateAsync({
				recipientWallet: walletAddress,
				message: message.trim() || undefined,
			}),
		);

		if (error) {
			console.error(error);
			toast.error(error.message || "Failed to send share request. Please try again.");
			return;
		}

		toast.success("Share request sent successfully!");
		setWalletAddress("");
		setMessage("");
		setOpen(false);
		onSuccess?.();
	};



	const handleClose = () => {
		setWalletAddress("");
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
