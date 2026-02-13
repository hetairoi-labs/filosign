import { and, eq } from "drizzle-orm";
import { decodeEventLog, type Hash, isHex } from "viem";
import db from "../db";
import { publish, topics } from "../events/bus";
import { evmClient, fsContracts } from "../evm";

const { users, shareApprovals, shareRequests } = db.schema;
const { FSKeyRegistry, FSManager } = fsContracts;

/** Retry waitForTransactionReceipt on Filecoin "null round" RPC errors */
async function waitForReceiptWithRetry(txHash: Hash, maxRetries = 10) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await evmClient.waitForTransactionReceipt({
				hash: txHash,
				retryCount: 6,
				retryDelay: 5_000,
			});
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : String(err);
			const details =
				typeof err === "object" && err !== null && "details" in err
					? String((err as { details?: unknown }).details)
					: "";
			const isNullRound =
				msg.includes("null round") ||
				msg.includes("requested epoch") ||
				details.includes("null round");
			if (attempt < maxRetries && isNullRound) {
				const delay = 15_000;
				console.warn(
					`[process] Filecoin null round, retry ${attempt}/${maxRetries} in ${delay / 1000}s`,
				);
				await new Promise((r) => setTimeout(r, delay));
			} else {
				throw err;
			}
		}
	}
	throw new Error(`Failed after ${maxRetries} retries`);
}

export async function processTransaction(
	txHash: Hash,
	data: Record<string, unknown>,
) {
	const receipt = await waitForReceiptWithRetry(txHash);

	if (!receipt) {
		throw new Error(`Transaction receipt not found for hash: ${txHash}`);
	}

	if (
		[
			receipt.contractAddress?.toLowerCase(),
			receipt.to?.toLowerCase(),
		].includes(FSKeyRegistry.address.toLowerCase())
	) {
		for (const encodedLog of receipt.logs) {
			if (
				encodedLog.address?.toLowerCase() !==
				FSKeyRegistry.address.toLowerCase()
			) {
				continue;
			}
			let log: { eventName: string; args: { user: `0x${string}` } };
			try {
				log = decodeEventLog({
					abi: FSKeyRegistry.abi,
					topics: encodedLog.topics,
					data: encodedLog.data,
				}) as typeof log;
			} catch {
				continue; // not our event
			}
			if (log.eventName !== "KeygenDataRegistered") continue;

			const { encryptionPublicKey, signaturePublicKey } = data;

			if (
				typeof encryptionPublicKey !== "string" ||
				!isHex(encryptionPublicKey)
			) {
				throw new Error("Invalid encryption public key");
			}
			if (
				typeof signaturePublicKey !== "string" ||
				!isHex(signaturePublicKey)
			) {
				throw new Error("Invalid signature public key");
			}

			const keygenData = await FSKeyRegistry.read.keygenData([log.args.user]);

			const [exists] = await db
				.select()
				.from(users)
				.where(eq(users.walletAddress, log.args.user));
			if (exists) continue;

			try {
				await db.insert(users).values({
					walletAddress: log.args.user,
					encryptionPublicKey,
					signaturePublicKey,

					lastActiveAt: new Date(),
					keygenDataJson: {
						saltPin: keygenData[0],
						saltSeed: keygenData[1],
						saltChallenge: keygenData[2],
						commitmentKem: keygenData[3],
						commitmentSig: keygenData[4],
					},
				});
			} catch (error) {
				console.error(`Error inserting user: ${error}`);
				throw error;
			}
			publish(topics.registration(txHash), {
				status: "completed",
				wallet: log.args.user,
			});
		}
	}
	if (
		[
			receipt.contractAddress?.toLowerCase(),
			receipt.to?.toLowerCase(),
		].includes(FSManager.address.toLowerCase())
	) {
		for (const encodedLog of receipt.logs) {
			try {
				const log = decodeEventLog({
					abi: FSManager.abi,
					topics: encodedLog.topics,
					data: encodedLog.data,
				});

				if (log.eventName === "SenderApproved") {
					if (!encodedLog.transactionHash) {
						continue;
					}

					// Check if both recipient and sender exist in users table
					const [recipientExists] = await db
						.select()
						.from(users)
						.where(eq(users.walletAddress, log.args.recipient))
						.limit(1);

					const [senderExists] = await db
						.select()
						.from(users)
						.where(eq(users.walletAddress, log.args.sender))
						.limit(1);

					if (!recipientExists || !senderExists) {
						continue;
					}

					await db.insert(shareApprovals).values({
						recipientWallet: log.args.recipient,
						senderWallet: log.args.sender,
						txHash: encodedLog.transactionHash,
						active: true,
					});

					// Check if there's a pending request and mark it as approved
					await db
						.update(shareRequests)
						.set({ status: "ACCEPTED" })
						.where(
							and(
								eq(shareRequests.senderWallet, log.args.sender),
								eq(shareRequests.recipientWallet, log.args.recipient),
								eq(shareRequests.status, "PENDING"),
							),
						);
				}

				if (log.eventName === "SenderRevoked") {
					// Check if both recipient and sender exist in users table
					const [recipientExists] = await db
						.select()
						.from(users)
						.where(eq(users.walletAddress, log.args.recipient))
						.limit(1);

					const [senderExists] = await db
						.select()
						.from(users)
						.where(eq(users.walletAddress, log.args.sender))
						.limit(1);

					if (!recipientExists || !senderExists) {
						continue;
					}

					await db.insert(shareApprovals).values({
						recipientWallet: log.args.recipient,
						senderWallet: log.args.sender,
						active: false,
						txHash: txHash,
					});
				}
			} catch (_error) {
				// Silently ignore decode errors
			}
		}
	}
}
