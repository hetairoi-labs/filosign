import {
	type FileInfo,
	useRpSignature,
	useSignFile,
} from "@filosign/react/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
	IDKitRequestWidget,
	type IDKitResult,
	orbLegacy,
	type RpContext,
} from "@worldcoin/idkit";
import { useRef, useState } from "react";
import Button from "../Button";

const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID;
const LINK_ACTION = import.meta.env.VITE_WORLD_ACTION;

export function IDKitSignTest({
	signerAddress,
	file,
}: {
	signerAddress: `0x${string}`;
	file: FileInfo;
}) {
	const [open, setOpen] = useState(false);
	const signFile = useSignFile();
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const signingRef = useRef(false);
	const queryClient = useQueryClient();

	console.log("signer:", signerAddress);

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
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["fsQ-file-info", file.pieceCid],
				}),
				queryClient.invalidateQueries({ queryKey: ["received-files"] }),
			]);
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
			const context = await getRpContext.mutateAsync({ action: LINK_ACTION });
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
			<Button mutation={rpMutation}>
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

			{rpContext && canSign && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={(next) => {
						if (!signFile.isPending) setOpen(next);
					}}
					app_id={WORLD_APP_ID}
					action={LINK_ACTION}
					action_description="Sign document"
					environment="staging"
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={orbLegacy({
						signal: `${signerAddress}:${file.pieceCid}`,
					})}
					handleVerify={async () => {}}
					onSuccess={(proof) => {
						void handleSignFile(proof);
					}}
				/>
			)}
		</div>
	);
}
