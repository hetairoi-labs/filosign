import { useLogin, useRpSignature } from "@filosign/react/hooks";
import {
	IDKitRequestWidget,
	type IDKitResult,
	orbLegacy,
	type RpContext,
} from "@worldcoin/idkit";
import { useRef, useState } from "react";
import Button from "../Button";

const WORLD_ID_APP_ID = "app_69f4036892019e6f616e47818ddebd8b";
const LINK_ACTION = "sign-flow";

export function IDKitLinkTest({
	userAddress,
	pin,
}: {
	userAddress: string;
	pin: string;
}) {
	const [open, setOpen] = useState(false);
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();
	const submittedRef = useRef(false);
	const login = useLogin();

	const canLink = Boolean(userAddress);

	const handleSuccess = async (proof: IDKitResult) => {
		if (!canLink || submittedRef.current) return;
		submittedRef.current = true;

		try {
			await login.mutateAsync({ pin, worldIdProof: proof });
			setOpen(false);
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

	// const verifyProof = async (result: IDKitResult) => {
	// 	console.log("[LINK] verifyProof rpContext?.rp_id:", rpContext?.rp_id);
	// 	console.log("[LINK] verifyProof result:", result);

	// 	const response = await fetch(
	// 		`https://developer.world.org/api/v4/verify/${rpContext?.rp_id}`,
	// 		{
	// 			method: "POST",
	// 			headers: { "content-type": "application/json" },
	// 			body: JSON.stringify(result),
	// 		},
	// 	);

	// 	console.log("[LINK] verifyProof response:", await response.json());

	// 	if (response.ok) {
	// 		return response.json();
	// 	} else {
	// 		const { code, detail } = await response.json();
	// 		throw new Error(`Error Code ${code}: ${detail}`);
	// 	}
	// };

	return (
		<div className="space-y-2">
			<Button mutation={rpMutation}>
				{rpMutation.isPending ? "Preparing..." : "Sign in"}
			</Button>

			{(rpMutation.isError || login.isError) && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<p className="font-medium">
						{rpMutation.isError ? "Failed to prepare linking" : "Login failed"}
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
						console.log("[LINK] proof:", proof);
						void handleSuccess(proof);
					}}
				/>
			)}
		</div>
	);
}
