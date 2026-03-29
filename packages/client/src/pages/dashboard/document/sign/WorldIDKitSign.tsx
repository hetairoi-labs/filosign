import {
	type FileInfo,
	useRpSignature,
	useSignFile,
} from "@filosign/react/hooks";
import { CaretRightIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
	IDKitRequestWidget,
	type IDKitResult,
	orbLegacy,
	type RpContext,
} from "@worldcoin/idkit";
import { useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";

const WORLD_ID_APP_ID = process.env.BUN_PUBLIC_WORLD_APP_ID;
const LINK_ACTION = process.env.BUN_PUBLIC_WORLD_ACTION;

export function WorldIDKitSign({
	signerAddress,
	file,
	actionLabel = "Send Document",
}: {
	signerAddress: `0x${string}`;
	file: FileInfo;
	actionLabel?: string;
}) {
	const [open, setOpen] = useState(false);
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const submittedRef = useRef(false);
	const signFile = useSignFile();
	const queryClient = useQueryClient();

	const canSign =
		Boolean(signerAddress) &&
		Boolean(file?.pieceCid) &&
		typeof file.pieceCid === "string" &&
		file.pieceCid.length > 0;

	const handleSuccess = async (proof: IDKitResult) => {
		if (!canSign || submittedRef.current) return;
		submittedRef.current = true;

		try {
			setOpen(false);
			await signFile.mutateAsync({
				pieceCid: file.pieceCid,
				worldIdProof: proof,
			});
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["fsQ-file-info", file.pieceCid],
				}),
				queryClient.invalidateQueries({ queryKey: ["received-files"] }),
			]);
		} catch {
			submittedRef.current = false;
		}
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
			<Button
				onClick={() => void rpMutation.mutate()}
				disabled={rpMutation.isPending}
				variant="primary"
				className="w-full"
			>
				{rpMutation.isPending ? (
					"Preparing..."
				) : rpMutation.isError || signFile.isError ? (
					<div className="flex items-center gap-2 group">
						<p>{actionLabel}</p>
						<CaretRightIcon className="transition-transform duration-200 size-4 group-hover:translate-x-1" />
					</div>
				) : (
					<div className="flex items-center text-destructive gap-2 group">
						<p>Signing Failed</p>
						<WarningCircleIcon
							weight="bold"
							className="transition-transform duration-200 size-5 group-hover:translate-x-1"
						/>
					</div>
				)}
			</Button>

			{rpContext && WORLD_ID_APP_ID && canSign && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={(next) => {
						if (!signFile.isPending) setOpen(next);
					}}
					app_id={WORLD_ID_APP_ID as `app_${string}`}
					action={LINK_ACTION}
					rp_context={rpContext}
					environment="staging"
					allow_legacy_proofs={true}
					preset={orbLegacy({
						signal: `${signerAddress.toLowerCase()}:${file.pieceCid}`,
					})}
					handleVerify={() => {}}
					onSuccess={(proof) => {
						void handleSuccess(proof);
					}}
				/>
			)}
		</div>
	);
}
