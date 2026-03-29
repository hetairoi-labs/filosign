import { useLogin, useRpSignature } from "@filosign/react/hooks";
import { CaretRightIcon } from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
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

export function WorldIDKitLink({
	pin,
	onSuccess,
}: {
	pin: string;
	onSuccess: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const submittedRef = useRef(false);
	const login = useLogin();
	const { user } = usePrivy();
	const userAddress = user?.wallet?.address;

	const canLink = Boolean(userAddress);

	const handleSuccess = async (proof: IDKitResult) => {
		if (!canLink || submittedRef.current) return;
		submittedRef.current = true;

		try {
			setOpen(false);
			await login.mutateAsync({ pin, worldIdProof: proof });
			onSuccess();
		} catch {
			submittedRef.current = false;
		}
	};

	const handleRetry = () => {
		submittedRef.current = false;
		login.reset();
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
		isPending: getRpContext.isPending || login.isPending,
		isError: getRpContext.isError,
		isSuccess: getRpContext.isSuccess && !login.isError,
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
				) : (
					<div className="flex items-center gap-2 group">
						<p>Verify Human</p>
						<CaretRightIcon className="transition-transform duration-200 size-4 group-hover:translate-x-1" />
					</div>
				)}
			</Button>

			{(rpMutation.isError || login.isError) && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<p className="font-medium">
						{rpMutation.isError
							? "Failed to prepare verification"
							: "Verification failed"}
					</p>
					<p className="mt-1 text-muted-foreground wrap-break-word">
						{(() => {
							const err = rpMutation.isError ? rpMutation.error : login.error;
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

			{rpContext && WORLD_ID_APP_ID && userAddress && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={(next) => {
						if (!login.isPending) setOpen(next);
					}}
					app_id={WORLD_ID_APP_ID as `app_${string}`}
					action={LINK_ACTION}
					rp_context={rpContext}
					environment="staging"
					allow_legacy_proofs={true}
					preset={orbLegacy({
						signal: userAddress.toLowerCase(),
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
