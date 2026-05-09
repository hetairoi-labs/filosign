import { useApproveSender, useCanSendTo } from "@filosign/react/hooks";
import { EyeIcon, SpinnerIcon, UserCheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "../../../lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../../lib/components/ui/card";
import { Input } from "../../../lib/components/ui/input";
import { Label } from "../../../lib/components/ui/label";

export function ShareSenderTest() {
	// Sender's side - check if can send to someone and approve senders
	const [checkAddress, setCheckAddress] = useState("");
	const [approveAddress, setApproveAddress] = useState("");

	const canSendTo = useCanSendTo({ recipient: checkAddress as `0x${string}` });
	const approveSender = useApproveSender();

	async function handleApproveSender() {
		if (!approveAddress.trim()) return;
		try {
			await approveSender.mutateAsync({
				sender: approveAddress as `0x${string}`,
			});
			console.log("Approved sender");
			setApproveAddress("");
		} catch (error) {
			console.error("Failed to approve sender", error);
		}
	}

	async function handleCheckCanSend() {
		if (!checkAddress.trim()) return;
		canSendTo.refetch();
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Check Can Send To */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<EyeIcon className="w-5 h-5" />
							Check Can Send To
						</CardTitle>
						<CardDescription>
							Check if you can send documents to another wallet
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<Label htmlFor="check-address">Wallet Address</Label>
								<Input
									id="check-address"
									placeholder="0x..."
									value={checkAddress}
									onChange={(e) => setCheckAddress(e.target.value)}
								/>
							</div>
							<Button
								onClick={handleCheckCanSend}
								disabled={!checkAddress.trim() || canSendTo.isFetching}
								className="w-full"
								size="lg"
							>
								{canSendTo.isFetching ? (
									<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<EyeIcon className="w-4 h-4 mr-2" />
								)}
								Check Permission
							</Button>
							{canSendTo.data !== undefined && (
								<div className="p-3 bg-muted rounded-lg">
									<p className="text-sm">
										Can send to {checkAddress}:{" "}
										<span
											className={
												canSendTo.data ? "text-green-600" : "text-red-600"
											}
										>
											{canSendTo.data ? "Yes" : "No"}
										</span>
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Approve Sender */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserCheckIcon className="w-5 h-5" />
							Approve Sender
						</CardTitle>
						<CardDescription>
							Allow a wallet to send documents to you
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="approve-address">Sender Wallet Address</Label>
							<Input
								id="approve-address"
								placeholder="0x..."
								value={approveAddress}
								onChange={(e) => setApproveAddress(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleApproveSender}
							disabled={!approveAddress.trim() || approveSender.isPending}
							className="w-full"
							size="lg"
						>
							{approveSender.isPending ? (
								<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<UserCheckIcon className="w-4 h-4 mr-2" />
							)}
							Approve Sender
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
