import { useRpSignature } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import {
	deviceLegacy,
	IDKitRequestWidget,
	type IDKitResult,
	type RpContext,
} from "@worldcoin/idkit";
import { useRef, useState } from "react";
import { Button } from "../ui/button";

const WORLD_ID_APP_ID = process.env.BUN_PUBLIC_WORLD_APP_ID;
const LINK_ACTION = "link-wallet";

export function LinkWalletWithIDKit() {
	const [open, setOpen] = useState(false);
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const linkingRef = useRef(false);
	const { user } = usePrivy();
	const userAddress = user?.wallet?.address;

	const canLink = Boolean(userAddress);

	const handleSuccess = async (proof: IDKitResult) => {
		if (!canLink || linkingRef.current) return;
		linkingRef.current = true;

		try {
			console.log("World ID proof received for linking:", proof);
			setOpen(false);
		} finally {
			linkingRef.current = false;
		}
	};

	const handleRetry = () => {
		getRpContext.reset();
		setRpContext(null);
		setOpen(false);
	};

	const rpMutation = {
		mutate: async () => {
			if (!canLink) return;
			const context = await getRpContext.mutateAsync({ action: LINK_ACTION });
			setRpContext(context);
			setOpen(true);
		},
		isPending: getRpContext.isPending,
		isError: getRpContext.isError,
		isSuccess: getRpContext.isSuccess,
		error: getRpContext.error,
	};

	return (
		<div className="space-y-2">
			<Button
				onClick={rpMutation.mutate}
				disabled={rpMutation.isPending || !canLink}
			>
				{rpMutation.isPending
					? "Preparing..."
					: "Verify Identity & Link Wallet"}
			</Button>

			{rpMutation.isError && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<p className="font-medium">Failed to prepare linking</p>
					<p className="mt-1 text-muted-foreground wrap-break-word">
						{rpMutation.error instanceof Error
							? rpMutation.error.message
							: "Something went wrong. Please try again."}
					</p>
					<button
						type="button"
						onClick={handleRetry}
						className="mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
					>
						Try again
					</button>
				</div>
			)}

			{rpContext && WORLD_ID_APP_ID && userAddress && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={(next) => {
						if (!linkingRef.current) setOpen(next);
					}}
					app_id={WORLD_ID_APP_ID as `app_${string}`}
					action={LINK_ACTION}
					action_description="Link your wallet for secure document signing"
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={deviceLegacy({
						signal: userAddress.toLowerCase(),
					})}
					handleVerify={async () => {}}
					onSuccess={(proof) => void handleSuccess(proof)}
				/>
			)}
		</div>
	);
}
