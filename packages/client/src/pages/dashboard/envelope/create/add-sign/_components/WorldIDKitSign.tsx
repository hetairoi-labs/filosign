import {
	type FileInfo,
	useRpSignature,
	useSignFile,
} from "@filosign/react/hooks";
import { CaretRightIcon } from "@phosphor-icons/react";
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

export type WorldIDKitSignProps = {
	signerAddress: `0x${string}`;
	/** Default sign-file flow; omit when using `onProofSuccess` only (e.g. envelope send gate). */
	file?: FileInfo;
	/** Overrides default `${address}:${file.pieceCid}` signal. */
	signal?: string;
	/** Hide the primary button; parent prepares RP and opens the modal. */
	hideTrigger?: boolean;
	/** Controlled modal open state (use with `rpContext` from parent). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/**
	 * Controlled RP context. If omitted, the component fetches RP when the trigger runs.
	 * Pass `null` until ready, then the resolved `RpContext`.
	 */
	rpContext?: RpContext | null;
	/**
	 * When set, called instead of `useSignFile` (e.g. run envelope send with proof).
	 * Attach proof to your API when the backend supports it.
	 */
	onProofSuccess?: (proof: IDKitResult) => void | Promise<void>;
};

export function WorldIDKitSign({
	signerAddress,
	file,
	signal: signalProp,
	hideTrigger = false,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	rpContext: controlledRpContext,
	onProofSuccess,
}: WorldIDKitSignProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [internalRp, setInternalRp] = useState<RpContext | null>(null);
	const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
	const setOpen = controlledOnOpenChange ?? setInternalOpen;
	const rpContext =
		controlledRpContext !== undefined ? controlledRpContext : internalRp;

	const getRpContext = useRpSignature();
	const submittedRef = useRef(false);
	const signFile = useSignFile();
	const queryClient = useQueryClient();

	const defaultSignFlow = !onProofSuccess;
	const canUseDefaultSign =
		defaultSignFlow &&
		Boolean(signerAddress) &&
		typeof file?.pieceCid === "string" &&
		file.pieceCid.length > 0;

	const canShowWidget =
		Boolean(WORLD_ID_APP_ID) &&
		Boolean(signerAddress) &&
		Boolean(rpContext) &&
		(onProofSuccess ? true : canUseDefaultSign);

	const signal =
		signalProp ??
		(file?.pieceCid
			? `${signerAddress.toLowerCase()}:${file.pieceCid}`
			: `${signerAddress.toLowerCase()}:envelope-send`);

	const handleSuccess = async (proof: IDKitResult) => {
		if (submittedRef.current) return;
		if (onProofSuccess) {
			submittedRef.current = true;
			try {
				setOpen(false);
				await onProofSuccess(proof);
			} catch {
				submittedRef.current = false;
			}
			return;
		}

		if (!canUseDefaultSign || submittedRef.current) return;
		const pieceCid = file?.pieceCid;
		if (typeof pieceCid !== "string" || !pieceCid) return;
		submittedRef.current = true;

		try {
			setOpen(false);
			await signFile.mutateAsync({
				pieceCid,
				worldIdProof: proof,
			});
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["fsQ-file-info", pieceCid],
				}),
				queryClient.invalidateQueries({ queryKey: ["received-files"] }),
			]);
		} catch {
			submittedRef.current = false;
		}
	};

	const handleRetry = () => {
		submittedRef.current = false;
		signFile.reset();
		getRpContext.reset();
		if (controlledRpContext === undefined) {
			setInternalRp(null);
		}
		setOpen(false);
	};

	const rpMutation = {
		mutate: async () => {
			if (!canUseDefaultSign && !onProofSuccess) return;
			const context = await getRpContext.mutateAsync({ action: LINK_ACTION });
			if (controlledRpContext === undefined) {
				setInternalRp(context);
			}
			setOpen(true);
		},
		isPending: getRpContext.isPending || signFile.isPending,
		isError: getRpContext.isError,
		isSuccess: getRpContext.isSuccess && !signFile.isError,
		error: getRpContext.error,
	};

	const showDefaultErrors =
		defaultSignFlow && (rpMutation.isError || signFile.isError);

	return (
		<div className="space-y-2">
			{!hideTrigger && (
				<Button
					onClick={() => void rpMutation.mutate()}
					disabled={rpMutation.isPending}
					variant="primary"
					className="w-full"
				>
					{rpMutation.isPending ? (
						"Preparing..."
					) : (
						<div className="flex items-center gap-2 group">
							<p>Send Document</p>
							<CaretRightIcon className="transition-transform duration-200 size-4 group-hover:translate-x-1" />
						</div>
					)}
				</Button>
			)}

			{showDefaultErrors && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<p className="font-medium">
						{rpMutation.isError
							? "Failed to prepare verification"
							: "Signing failed"}
					</p>
					<p className="mt-1 text-muted-foreground wrap-break-word">
						{(() => {
							const err = rpMutation.isError
								? rpMutation.error
								: signFile.error;
							return err instanceof Error
								? err.message
								: "Something went wrong. Please try again.";
						})()}
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

			{canShowWidget && rpContext && WORLD_ID_APP_ID && (
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
						signal,
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
