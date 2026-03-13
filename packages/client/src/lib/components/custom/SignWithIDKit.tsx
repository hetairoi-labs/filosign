import {
	type FileInfo,
	useRpSignature,
	useSignFile,
} from "@filosign/react/hooks";
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
const ACTION = "sign-doc";

export function SignWithIDKit({ file }: { file: FileInfo }) {
	const [open, setOpen] = useState(false);
	const signFile = useSignFile();
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const signingRef = useRef(false);
	const { user } = usePrivy();
	const signerAddress = user?.wallet?.address;

	const canSign =
		file?.pieceCid &&
		signerAddress &&
		typeof file.pieceCid === "string" &&
		file.pieceCid.length > 0;

	const handleSignFile = async (proof: IDKitResult) => {
		if (!canSign) return;
		if (signingRef.current) return;
		signingRef.current = true;
		try {
			await signFile.mutateAsync({
				pieceCid: file.pieceCid,
				worldIdProof: proof,
			});
			setOpen(false);
		} finally {
			signingRef.current = false;
		}
	};

	const handleRetry = () => {
		signFile.reset();
		getRpContext.reset();
		setRpContext(null);
		setOpen(false);
	};

	const rpMutation = {
		mutate: async () => {
			if (!canSign) return;
			const context = await getRpContext.mutateAsync({ action: ACTION });
			setRpContext(context);
			setOpen(true);
		},
		isPending: getRpContext.isPending || signFile.isPending,
		isError: getRpContext.isError,
		isSuccess: getRpContext.isSuccess && !signFile.isError,
		error: getRpContext.error,
	};

	return (
		<div className="space-y-2">
			<Button onClick={rpMutation.mutate}>
				{signFile.isPending ? "Signing…" : "Sign Document"}
			</Button>

			{signFile.isError && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<p className="font-medium">Signing failed</p>
					<p className="mt-1 text-muted-foreground wrap-break-word">
						{signFile.error instanceof Error
							? signFile.error.message
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

			{rpContext && WORLD_ID_APP_ID && canSign && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={(next) => {
						if (!signFile.isPending) setOpen(next);
					}}
					app_id={WORLD_ID_APP_ID as `app_${string}`}
					action={ACTION}
					action_description={`Sign document ${file.pieceCid}`}
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={deviceLegacy({
						signal: `${signerAddress}:${file.pieceCid}`,
					})}
					handleVerify={async () => {}}
					onSuccess={(proof) => void handleSignFile(proof)}
				/>
			)}
		</div>
	);
}
