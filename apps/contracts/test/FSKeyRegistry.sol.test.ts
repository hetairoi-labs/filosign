import { signatures, walletKeyGen } from "@filosign/crypto-utils/node";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { publicActions } from "viem";

async function setupFixture() {
	const [deployer, user] = await hre.viem.getWalletClients();
	const admin = (await hre.viem.getTestClient()).extend(publicActions);

	const manager = await hre.viem.deployContract("FSManager");
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);

	return { deployer, user, keyRegistry, admin };
}

describe("FSKeyRegistry", () => {
	it("stores relevant information for the user to be able to regenerate encryption keys", async () => {
		const dl = await signatures.dilithiumInstance();
		const { keyRegistry, user } = await loadFixture(setupFixture);
		const { saltPin, saltSeed, saltChallenge, commitmentKem, commitmentSig } =
			await walletKeyGen(user, { dl });

		expect(
			await keyRegistry.read.isRegistered([user.account.address]),
		).to.equal(false);

		await keyRegistry.write.registerKeygenData(
			[saltPin, saltSeed, saltChallenge, commitmentKem, commitmentSig],
			{ account: user.account },
		);

		expect(
			await keyRegistry.read.isRegistered([user.account.address]),
		).to.equal(true);

		const storedData = await keyRegistry.read.keygenData([
			user.account.address,
		]);

		expect(storedData[0]).to.equal(saltPin);
		expect(storedData[1]).to.equal(saltSeed);
		expect(storedData[2]).to.equal(saltChallenge);
		expect(storedData[3]).to.equal(commitmentKem);
		expect(storedData[4]).to.equal(commitmentSig);

		const reconstructed = await walletKeyGen(user, {
			dl,
			salts: {
				pin: storedData[0],
				seed: storedData[1],
				challenge: storedData[2],
			},
		});
		expect(reconstructed.commitmentKem).to.equal(commitmentKem);
		expect(reconstructed.commitmentSig).to.equal(commitmentSig);
	});
});
