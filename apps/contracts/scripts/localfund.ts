import hre from "hardhat";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
	const chainId = hre.network.config.chainId;
	const funderPrivateKey = Bun.env.FC_PVT_KEY as `0x${string}` | undefined;
	if (chainId !== 31337) {
		console.error("No ?");
		process.exit(1);
	}

	if (!funderPrivateKey) {
		console.error("FC_PVT_KEY is required for local funding");
		process.exit(1);
	}

	const funderAddress = privateKeyToAccount(funderPrivateKey).address;
	const u1 = await hre.viem.getWalletClient(funderAddress);

	for (const x of ["0xB8dd3786942057d4Bc78Fc894B80E8745151FE70"] as const) {
		await u1.sendTransaction({
			to: x,
			value: 1_000_000_000_000_000n,
		});
	}
}

main()
	.then(() => console.log("Deployment script finished"))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
