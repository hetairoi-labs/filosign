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
import Button from "../Button";

const WORLD_ID_APP_ID = "app_69f4036892019e6f616e47818ddebd8b";
const ACTION = "sign-doc";

export function IDKitTest({
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

	const handleSignFile = async (proof: IDKitResult) => {
		if (!file) return;
		await signFile.mutateAsync({
			pieceCid: file.pieceCid,
			worldIdProof: proof,
		});
	};

	const rpMutation = {
		mutate: async () => {
			const context = await getRpContext.mutateAsync({ action: ACTION });
			setRpContext(context);
			setOpen(true);
		},
		isPending: getRpContext.isPending,
		isError: getRpContext.isError,
		isSuccess: getRpContext.isSuccess,
		error: getRpContext.error,
	};

	return (
		<>
			<Button mutation={rpMutation}>Sign Document</Button>

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
