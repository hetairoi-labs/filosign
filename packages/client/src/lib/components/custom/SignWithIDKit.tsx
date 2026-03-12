import { type FileInfo, useSignFile } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "@tanstack/react-router";
import {
	IDKitRequestWidget,
	type IDKitResult,
	orbLegacy,
} from "@worldcoin/idkit";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { useWorldIdContext } from "@/src/lib/hooks/useWorldIdContext";

export default function SignWithIDKit({
	pieceCid,
	file,
}: {
	pieceCid: string;
	file: FileInfo;
}) {
	const [open, setOpen] = useState(false);
	const { user } = usePrivy();
	const signFile = useSignFile();
	const { rpContext, isLoading } = useWorldIdContext(pieceCid);
	const navigate = useNavigate();

	const handleSignFile = async (proof: IDKitResult) => {
		if (!file) return;

		try {
			await signFile.mutateAsync({
				pieceCid: file.pieceCid,
				worldIdProof: proof,
			});
			toast.success("Document signed successfully!");
			navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to sign file:", error);
			toast.error("Failed to sign document");
		}
	};

	return (
		<>
			<Button
				type="button"
				onClick={() => setOpen(true)}
				disabled={isLoading || !rpContext}
			>
				{isLoading ? "Loading..." : "Sign Document"}
			</Button>

			{rpContext && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={setOpen}
					app_id={process.env.BUN_PUBLIC_WORLD_APP_ID as `app_${string}`}
					action={pieceCid}
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={orbLegacy({ signal: user?.wallet?.address })}
					environment="production"
					handleVerify={async (result) => {
						const response = await fetch("/api/verify-proof", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({
								rp_id: rpContext.rp_id,
								idkitResponse: result,
							}),
						});

						if (!response.ok) {
							throw new Error("Backend verification failed");
						}
					}}
					onSuccess={(proof) => handleSignFile(proof)}
					onError={(errorCode) => {
						console.error("IDKit error", errorCode);
					}}
				/>
			)}
		</>
	);
}
