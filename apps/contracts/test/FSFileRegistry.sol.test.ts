// import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
// import { expect } from "chai";
// import hre from "hardhat";
// import { describe, it } from "mocha";
// import { keccak256, parseSignature, publicActions, toBytes } from "viem";
// import { computeCidIdentifier, parsePieceCid } from "../services/utils";

// const samplePieceCid =
// 	"bafkzcibcbub2cd46abwvhoohwhmmjugyjibda32vn4a4qlcrv5dc76s24s67qai";

// async function setupFixture() {
// 	const [deployer, sender, signer1, signer2, other] =
// 		await hre.viem.getWalletClients();
// 	const admin = (await hre.viem.getTestClient()).extend(publicActions);

// 	const manager = await hre.viem.deployContract("FSManager");
// 	const fileRegistryAddress = await manager.read.fileRegistry();
// 	const fileRegistry = await hre.viem.getContractAt(
// 		"FSFileRegistry",
// 		fileRegistryAddress,
// 	);

// 	await manager.write.approveSender([sender.account.address], {
// 		account: signer1.account,
// 	});
// 	await manager.write.approveSender([sender.account.address], {
// 		account: signer2.account,
// 	});

// 	return {
// 		deployer,
// 		sender,
// 		signer1,
// 		signer2,
// 		other,
// 		manager,
// 		fileRegistry,
// 		admin,
// 	};
// }

describe("FSFileRegistry", () => {
	//     it("registers a file successfully when sender is approved", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const txHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: txHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const fileData = await fileRegistry.read.getFileData([cidIdentifier]);
	//         expect(fileData.pieceCidPrefix).to.equal(pieceCidPrefix);
	//         expect(fileData.pieceCidBuffer).to.equal(pieceCidBuffer);
	//         expect(fileData.pieceCidTail).to.equal(pieceCidTail);
	//         expect(fileData.sender.toLowerCase()).to.equal(
	//             sender.account.address.toLowerCase(),
	//         );
	//         const isRecipient = await fileRegistry.read.isRecipient([
	//             cidIdentifier,
	//             recipient.account.address,
	//         ]);
	//         expect(isRecipient).to.equal(true);
	//     });
	//     it("fails to register file when sender is not approved", async () => {
	//         const {
	//             fileRegistry,
	//             other,
	//             recipient1: recipient,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         await expect(
	//             fileRegistry.write.registerFile(
	//                 [
	//                     pieceCidPrefix,
	//                     pieceCidBuffer,
	//                     pieceCidTail,
	//                     [recipient.account.address],
	//                 ],
	//                 { account: other.account },
	//             ),
	//         ).to.be.rejectedWith("Sender not approved by recipient");
	//     });
	//     it("fails to register file that already exists", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const txHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: txHash });
	//         await expect(
	//             fileRegistry.write.registerFile(
	//                 [
	//                     pieceCidPrefix,
	//                     pieceCidBuffer,
	//                     pieceCidTail,
	//                     [recipient.account.address],
	//                 ],
	//                 { account: sender.account },
	//             ),
	//         ).to.be.rejectedWith("File already registered");
	//     });
	//     it("allows recipient to acknowledge a file", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         // const fileData = await fileRegistry.read.getFileData([cidIdentifier]);
	//         const isAcked = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient.account.address,
	//         ]);
	//         expect(isAcked).to.equal(true);
	//     });
	//     it("fails when non-recipient tries to acknowledge", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             other,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         await expect(
	//             fileRegistry.write.acknowledge([cidIdentifier], {
	//                 account: other.account,
	//             }),
	//         ).to.be.rejectedWith("Only recipient can ack");
	//     });
	//     it("fails to acknowledge non-existent file", async () => {
	//         const { fileRegistry, recipient1: recipient } =
	//             await loadFixture(setupFixture);
	//         const fakeCidIdentifier = keccak256(toBytes("fake-identifier"));
	//         await expect(
	//             fileRegistry.write.acknowledge([fakeCidIdentifier], {
	//                 account: recipient.account,
	//             }),
	//         ).to.be.rejectedWith("File not registered");
	//     });
	//     it("fails to acknowledge already acknowledged file", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         await expect(
	//             fileRegistry.write.acknowledge([cidIdentifier], {
	//                 account: recipient.account,
	//             }),
	//         ).to.be.rejectedWith("Already acknowledged");
	//     });
	//     it("allows recipient to submit signature after acknowledgment", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         const { r, s, v } = await signFileSignature({
	//             walletClient: recipient,
	//             contractAddress: fileRegistry.address,
	//             pieceCid: samplePieceCid,
	//             signatureVisualHash,
	//         });
	//         const submitSigTxHash = await fileRegistry.write.submitSignature(
	//             [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//             { account: recipient.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: submitSigTxHash });
	//         const signatureData = await fileRegistry.read.getSignatureData([
	//             cidIdentifier,
	//         ]);
	//         expect(signatureData.signer.toLowerCase()).to.equal(
	//             recipient.account.address.toLowerCase(),
	//         );
	//         expect(signatureData.timestamp).to.be.greaterThan(0);
	//     });
	//     it("fails to submit signature before acknowledgment", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const { r, s, v } = await signFileSignature({
	//             walletClient: recipient,
	//             contractAddress: fileRegistry.address,
	//             pieceCid: samplePieceCid,
	//             signatureVisualHash,
	//         });
	//         await expect(
	//             fileRegistry.write.submitSignature(
	//                 [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//                 { account: recipient.account },
	//             ),
	//         ).to.be.rejectedWith(
	//             "file needs to be acknowledged before submitting signature",
	//         );
	//     });
	//     it("fails when non-recipient tries to submit signature", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             other,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         const { r, s, v } = await signFileSignature({
	//             walletClient: other,
	//             contractAddress: fileRegistry.address,
	//             pieceCid: samplePieceCid,
	//             signatureVisualHash,
	//         });
	//         await expect(
	//             fileRegistry.write.submitSignature(
	//                 [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//                 { account: other.account },
	//             ),
	//         ).to.be.rejectedWith("Only recipient can submit signature");
	//     });
	//     it("fails to submit signature twice", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         const { r, s, v } = await signFileSignature({
	//             walletClient: recipient,
	//             contractAddress: fileRegistry.address,
	//             pieceCid: samplePieceCid,
	//             signatureVisualHash,
	//         });
	//         const submitSigTxHash = await fileRegistry.write.submitSignature(
	//             [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//             { account: recipient.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: submitSigTxHash });
	//         await expect(
	//             fileRegistry.write.submitSignature(
	//                 [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//                 { account: recipient.account },
	//             ),
	//         ).to.be.rejectedWith("Signature already submitted");
	//     });
	//     it("fails with invalid signature", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         const wrongMessageHash = keccak256(toBytes("wrong-message"));
	//         const signature = await recipient.signMessage({
	//             message: { raw: wrongMessageHash },
	//         });
	//         const { r, s, v } = parseSignature(signature);
	//         await expect(
	//             fileRegistry.write.submitSignature(
	//                 [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//                 { account: recipient.account },
	//             ),
	//         ).to.be.rejectedWith("Invalid signature");
	//     });
	//     it("correctly calculates cidIdentifier", async () => {
	//         const { fileRegistry } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const calculatedIdentifier = await fileRegistry.read.cidIdentifier([
	//             pieceCidPrefix,
	//             pieceCidBuffer,
	//             pieceCidTail,
	//         ]);
	//         const expectedIdentifier = computeCidIdentifier(samplePieceCid);
	//         expect(calculatedIdentifier).to.equal(expectedIdentifier);
	//     });
	//     it("isAcknowledged returns true after acknowledgment", async () => {
	//         const {
	//             fileRegistry,
	//             sender,
	//             recipient1: recipient,
	//             admin,
	//         } = await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         let isAcked = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient.account.address,
	//         ]);
	//         expect(isAcked).to.equal(false);
	//         const ackTxHash = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash });
	//         isAcked = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient.account.address,
	//         ]);
	//         expect(isAcked).to.equal(true);
	//     });
	//     it("handles multiple recipients correctly", async () => {
	//         const { fileRegistry, sender, recipient1, recipient2, admin } =
	//             await loadFixture(setupFixture);
	//         const {
	//             digestPrefix: pieceCidPrefix,
	//             digestBuffer: pieceCidBuffer,
	//             digestTail: pieceCidTail,
	//         } = parsePieceCid(samplePieceCid);
	//         const registerTxHash = await fileRegistry.write.registerFile(
	//             [
	//                 pieceCidPrefix,
	//                 pieceCidBuffer,
	//                 pieceCidTail,
	//                 [recipient1.account.address, recipient2.account.address],
	//             ],
	//             { account: sender.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: registerTxHash });
	//         const cidIdentifier = computeCidIdentifier(samplePieceCid);
	//         const isRecipient1 = await fileRegistry.read.isRecipient([
	//             cidIdentifier,
	//             recipient1.account.address,
	//         ]);
	//         expect(isRecipient1).to.equal(true);
	//         const isRecipient2 = await fileRegistry.read.isRecipient([
	//             cidIdentifier,
	//             recipient2.account.address,
	//         ]);
	//         expect(isRecipient2).to.equal(true);
	//         let isAcked1 = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient1.account.address,
	//         ]);
	//         expect(isAcked1).to.equal(false);
	//         let isAcked2 = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient2.account.address,
	//         ]);
	//         expect(isAcked2).to.equal(false);
	//         const ackTxHash1 = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient1.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash1 });
	//         isAcked1 = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient1.account.address,
	//         ]);
	//         expect(isAcked1).to.equal(true);
	//         isAcked2 = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient2.account.address,
	//         ]);
	//         expect(isAcked2).to.equal(false);
	//         const signatureVisualHash = keccak256(toBytes("signature-visual-data"));
	//         const { r, s, v } = await signFileSignature({
	//             walletClient: recipient1,
	//             contractAddress: fileRegistry.address,
	//             pieceCid: samplePieceCid,
	//             signatureVisualHash,
	//         });
	//         await expect(
	//             fileRegistry.write.submitSignature(
	//                 [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//                 { account: recipient2.account },
	//             ),
	//         ).to.be.rejectedWith(
	//             "file needs to be acknowledged before submitting signature",
	//         );
	//         const submitSigTxHash = await fileRegistry.write.submitSignature(
	//             [cidIdentifier, signatureVisualHash, Number(v), r, s],
	//             { account: recipient1.account },
	//         );
	//         await admin.waitForTransactionReceipt({ hash: submitSigTxHash });
	//         const ackTxHash2 = await fileRegistry.write.acknowledge([cidIdentifier], {
	//             account: recipient2.account,
	//         });
	//         await admin.waitForTransactionReceipt({ hash: ackTxHash2 });
	//         isAcked2 = await fileRegistry.read.isAcknowledged([
	//             cidIdentifier,
	//             recipient2.account.address,
	//         ]);
	//         expect(isAcked2).to.equal(true);
	//     });
	//     it("returns empty data for non-existent file", async () => {
	//         const { fileRegistry } = await loadFixture(setupFixture);
	//         const fakeCidIdentifier = keccak256(toBytes("fake-identifier"));
	//         const fileData = await fileRegistry.read.getFileData([fakeCidIdentifier]);
	//         expect(fileData.pieceCidPrefix).to.equal(
	//             "0x0000000000000000000000000000000000000000000000000000000000000000",
	//         );
	//         expect(fileData.pieceCidBuffer).to.equal(
	//             "0x00000000000000000000000000000000",
	//         );
	//         expect(fileData.pieceCidTail).to.equal(
	//             "0x0000000000000000000000000000000000000000000000000000000000000000",
	//         );
	//         expect(fileData.sender).to.equal(
	//             "0x0000000000000000000000000000000000000000",
	//         );
	//     });
	//     it("returns empty signature data for non-existent signature", async () => {
	//         const { fileRegistry } = await loadFixture(setupFixture);
	//         const fakeCidIdentifier = keccak256(toBytes("fake-identifier"));
	//         const signatureData = await fileRegistry.read.getSignatureData([
	//             fakeCidIdentifier,
	//         ]);
	//         expect(signatureData.signer).to.equal(
	//             "0x0000000000000000000000000000000000000000",
	//         );
	//         expect(signatureData.timestamp).to.equal(0);
	//         expect(signatureData.signatureVisualHash).to.equal(
	//             "0x0000000000000000000000000000000000000000000000000000000000000000",
	//         );
	//         expect(signatureData.v).to.equal(0);
	//         expect(signatureData.r).to.equal(
	//             "0x0000000000000000000000000000000000000000000000000000000000000000",
	//         );
	//         expect(signatureData.s).to.equal(
	//             "0x0000000000000000000000000000000000000000000000000000000000000000",
	//         );
	//     });
});
