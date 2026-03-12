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

const WORLD_ID_APP_ID = "app_69f4036892019e6f616e47818ddebd8b";
const ACTION = "sign-doc";

export default function SignWithIDKit({
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

	console.log("rpContext", rpContext);
	console.log("signerAddress", signerAddress);

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
					console.log("action", ACTION);
					const context = await getRpContext.mutateAsync({ action: ACTION });
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
					app_id={WORLD_ID_APP_ID}
					action={ACTION}
					action_description="Sign document"
					rp_context={rpContext}
					allow_legacy_proofs={true}
					preset={orbLegacy({ signal: `${signerAddress}:${file.pieceCid}` })}
					handleVerify={async () => {}}
					onSuccess={(proof) => handleSignFile(proof)}
				/>
			)}
		</>
	);
}
