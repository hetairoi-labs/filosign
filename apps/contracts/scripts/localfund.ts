import hre from "hardhat";

async function main() {
	const chainId = hre.network.config.chainId;
	if (chainId !== 31337) {
		console.error("No ?");
		process.exit(1);
	}

	const [u1, _u2] = await hre.viem.getWalletClients();

	for (const x of ["0xB8dd3786942057d4Bc78Fc894B80E8745151FE70"] as const) {
		u1.sendTransaction({
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
