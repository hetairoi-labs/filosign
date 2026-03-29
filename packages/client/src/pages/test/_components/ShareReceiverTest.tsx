import { useCanReceiveFrom, useRevokeSender } from "@filosign/react/hooks";
import { EyeIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
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

export function ShareReceiverTest() {
	// Receiver's side - check who can send to you and revoke senders
	const [checkSenderAddress, setCheckSenderAddress] = useState("");
	const [revokeSenderAddress, setRevokeSenderAddress] = useState("");

	const canReceiveFrom = useCanReceiveFrom({
		sender: checkSenderAddress as `0x${string}`,
	});
	const revokeSender = useRevokeSender();

	async function handleRevokeSender() {
		if (!revokeSenderAddress.trim()) return;
		try {
			await revokeSender.mutateAsync(revokeSenderAddress as `0x${string}`);
			console.log("Revoked sender");
			setRevokeSenderAddress("");
		} catch (error) {
			console.error("Failed to revoke sender", error);
		}
	}

	async function handleCheckCanReceive() {
		if (!checkSenderAddress.trim()) return;
		canReceiveFrom.refetch();
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Check Can Receive From */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<EyeIcon className="w-5 h-5" />
							Check Can Receive From
						</CardTitle>
						<CardDescription>
							Check if a wallet can send documents to you
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<Label htmlFor="check-sender-address">
									Sender Wallet Address
								</Label>
								<Input
									id="check-sender-address"
									placeholder="0x..."
									value={checkSenderAddress}
									onChange={(e) => setCheckSenderAddress(e.target.value)}
								/>
							</div>
							<Button
								onClick={handleCheckCanReceive}
								disabled={
									!checkSenderAddress.trim() || canReceiveFrom.isFetching
								}
								className="w-full"
								size="lg"
							>
								{canReceiveFrom.isFetching ? (
									<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<EyeIcon className="w-4 h-4 mr-2" />
								)}
								Check Permission
							</Button>
							{canReceiveFrom.data !== undefined && (
								<div className="p-3 bg-muted rounded-lg">
									<p className="text-sm">
										Can receive from {checkSenderAddress}:{" "}
										<span
											className={
												canReceiveFrom.data ? "text-green-600" : "text-red-600"
											}
										>
											{canReceiveFrom.data ? "Yes" : "No"}
										</span>
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Revoke Sender */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<XIcon className="w-5 h-5" />
							Revoke Sender
						</CardTitle>
						<CardDescription>
							Remove permission for a wallet to send documents to you
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="revoke-sender-address">
								Sender Wallet Address
							</Label>
							<Input
								id="revoke-sender-address"
								placeholder="0x..."
								value={revokeSenderAddress}
								onChange={(e) => setRevokeSenderAddress(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleRevokeSender}
							disabled={!revokeSenderAddress.trim() || revokeSender.isPending}
							variant="destructive"
							className="w-full"
							size="lg"
						>
							{revokeSender.isPending ? (
								<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<XIcon className="w-4 h-4 mr-2" />
							)}
							Revoke Sender
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
