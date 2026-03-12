import {
	type FileInfo,
	useRpSignature,
	useSignFile,
} from "@filosign/react/hooks";
import {
	IDKitRequestWidget,
	type IDKitResult,
	orbLegacy,
	type RpContext,
} from "@worldcoin/idkit";
import { useState } from "react";

const WORLD_APP_ID = "app_staging_f6a9e10ca945a0b51d2cac6ad15fc72e";

export default function SignWithIDKit({
	signerAddress,
	pieceCid,
	file,
}: {
	signerAddress: `0x${string}`;
	pieceCid: string;
	file: FileInfo;
}) {
	const [open, setOpen] = useState(false);
	const signFile = useSignFile();
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();

	console.log("rpContext", rpContext);

	const handleSignFile = async (proof: IDKitResult) => {
		if (!file) return;

		try {
			await signFile.mutateAsync({
				pieceCid: file.pieceCid,
				worldIdProof: proof,
			});
		} catch (error) {
			console.error("Failed to sign file:", error);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={async () => {
					const context = await getRpContext.mutateAsync({ action: pieceCid });
					setRpContext(context);
					setOpen(true);
				}}
				disabled={getRpContext.isPending}
				className="bg-black text-white px-4 py-2 rounded-md mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{getRpContext.isPending ? "Loading..." : "Sign Document"}
			</button>

			{rpContext && (
				<IDKitRequestWidget
					open={open}
					onOpenChange={setOpen}
					app_id={WORLD_APP_ID}
					action={pieceCid}
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={orbLegacy({ signal: signerAddress })}
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
