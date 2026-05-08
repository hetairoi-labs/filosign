export type BlogPost = {
	id: string;
	title: string;
	readingTime: string;
	date: string;
	author: {
		name: string;
		role: string;
		avatar: string;
	};
	heroImage: string;
	heroVideo?: string;
	quote?: string;
	content: string;
};

export const blogPosts: Record<string, BlogPost> = {
	"post-1": {
		id: "post-1",
		title: "The future of digital agreements: Why we built Filosign",
		readingTime: "5 min",
		date: "Jan 6, 2025",
		author: {
			name: "Kartikay Tiwari",
			role: "Article written by",
			avatar: "/static/banner.webp",
		},
		heroImage: "/static/banner.webp",
		quote:
			'"We needed a way to sign documents that didn\'t rely on a central authority holding the keys," says Sarah Chen, CTO of OpenDocs.',
		content: `
In the world of digital agreements, trust has always been outsourced. When you sign a document using a traditional e-signature platform, you're not just trusting the other party—you're trusting the platform itself to store, secure, and verify that signature. But what happens when that centralized trust fails? Or when privacy is paramount?

At **Filosign**, we asked a simple question: *What if you could prove a document was signed without trusting a middleman?*

## The Problem with Centralized Signing

Enterprises using centralized e-signature platforms are exposed to significant, unaddressed "platform risk." They must trust their provider's security, internal policies, and long-term viability. This creates a central point of failure for their most critical assets: their signed agreements.

*   **Data Vulnerability**: Centralized servers are prime targets for hacks.
*   **Vendor Lock-in**: Moving your signed contracts out of a proprietary platform is often difficult and costly.
*   **Privacy Concerns**: The platform provider technically has access to every sensitive contract you sign.
*   **Platform Risk**: A security breach, policy change, or service shutdown could invalidate legally binding documents.

We believe your agreements should belong to you, not a SaaS provider. That's why we built Filosign on top of the Filecoin Virtual Machine (FVM) and post-quantum cryptographic principles.

### A New Architecture for Trust

Filosign leverages the power of the Filecoin network and quantum-resistant cryptography to create a signing experience that is secure, permanent, and private by default.

| Feature | Traditional E-Sign | Filosign |
|:---|:---|:---|
| **Storage** | Centralized Cloud | Decentralized (Filecoin/IPFS) |
| **Verification** | Platform-Dependent | Cryptographically Verifiable Anywhere |
| **Privacy** | Platform Can Read Docs | End-to-End Client-Side Encryption |
| **Cryptography** | Standard RSA/ECDSA | Post-Quantum (Kyber + Dilithium) |
| **Authentication** | Password/2FA | Wallet Identity + Local PIN Unlock |
| **Cost** | High Per-User Fees | Pay-as-you-go / Low Flat Rate |

> "Decentralized identity isn't just about privacy; it's about ownership. When you sign with your own keys, you own the attestation forever." — *Dr. Gavin Wood*

## How Filosign Works

Under the hood, Filosign combines user-friendly design with robust web3 technologies. You don't need to be a crypto expert to use it—it feels just like the tools you already know, but with mathematical certainty.

### Wallet Identity + Local PIN Protection

Filosign uses a non-custodial model where your wallet proves identity and your PIN protects local seed storage:

1.  **Wallet Signature**: You prove ownership of your address by signing a unique challenge.
2.  **Deterministic Seed**: A secure seed is derived client-side from wallet signature material and on-chain salts.
3.  **PIN Wrapping**: The local seed is encrypted with a PIN-derived key (Argon2id + AES-GCM), so a stolen browser profile is still protected.
4.  **Recovery Phrase**: A 24-word recovery phrase can restore access if you forget your PIN.

### Document Encryption & Storage

1.  **Client-Side Encryption**: Your document is encrypted locally using AES-GCM with a randomly generated file encryption key.
2.  **Filecoin Storage**: The encrypted file is uploaded to the Filecoin network via FilCDN, returning a unique Content ID (CID).
3.  **Key Sharing**: Using Kyber/ML-KEM-1024 (post-quantum key exchange), we create a shared secret with each recipient's public key, ensuring only intended recipients can decrypt.
4.  **Blockchain Anchoring**: Document metadata and signature commitments are stored on FVM smart contracts, creating an immutable audit trail.

### Post-Quantum Signatures

Filosign uses **Dilithium** (NIST Level 2) for document signing, providing quantum-resistant signatures that will remain secure even when quantum computers become a threat:

\`\`\`typescript
// Example: How we verify a signature locally
import { verifyMessage } from '@filosign/react-sdk';

async function checkDocument(documentHash: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) {
  const isValid = await verifyMessage(
    documentHash,
    signature,
    publicKey
  );
  
  return isValid; // True if the Dilithium signature matches
}
\`\`\`

## Built for the Modern Workflow

We didn't just build a protocol; we built a product. Filosign integrates seamlessly into your existing workflow with a comprehensive React SDK.

*   **Document Management**: Upload, encrypt, and share documents with granular access control.
*   **Signature Library**: Create, manage, and reuse multiple signature styles (draw, type, or upload).
*   **Secure Sharing**: Permission-based sharing with ECDH key exchange ensures only approved recipients can access documents.
*   **User Profiles**: Decentralized identity with usernames, avatars, and rich metadata.
*   **API Access**: Type-safe React hooks and REST API for automating signing flows.

### Architecture Highlights

Filosign's architecture is fully non-custodial with zero-trust design:

- **Smart Contracts**: FVM Solidity contracts (FSManager, FSKeyRegistry, FSFileRegistry) handle on-chain logic
- **Backend API**: Hono REST API orchestrates Filecoin storage and blockchain interactions
- **Crypto Utils**: WebAssembly cryptographic primitives (Kyber, Dilithium, AES-GCM) for high-performance operations
- **React SDK**: TypeScript client library with React hooks, IndexedDB caching, and automatic error handling

As we move towards a more decentralized web, the tools we use to agree and transact must evolve. Filosign is the first step towards a future where digital signatures are as permanent and sovereign as ink on paper—but mathematically verifiable and quantum-resistant.

Ready to take control of your documents? [Start for free](/onboarding) today.
`,
	},
	"introducing-filosign": {
		id: "introducing-filosign",
		title: "Introducing Filosign",
		readingTime: "3 min",
		date: "Apr 29, 2026",
		author: {
			name: "Kartik",
			role: "Written by",
			avatar: "/static/kartik.jpeg",
		},
		heroImage: "/static/banner.webp",
		heroVideo: "/static/demo.webm",
		content: `
Six months ago, we started working on Filosign; an idea focused on creating a completely private and end-to-end encrypted document signing standard.

*"But e-sign is a commodity, so why do we need a new app for it?"*

Because almost all of the e-signature solutions out there are tied to a particular vendor and the vendor controls your files as well as your signatures, not you. If that vendor gets breached, all your sensitive data is at the risk of being exposed to bad actors. If their database disappears, your proof disappears. We propose a new standard that overcomes these flaws.

To achieve that, our main challenges were:

*   Nobody apart from the sender and the recipients should be able to access the files.
*   The signature needs to be permanently tied to the sender and recipient in a way that it is verifiable (and accessible) by anyone, from anywhere.

Filosign solves these challenges using a combination of cryptography and blockchain technology:

*   End-to-end client-side encryption of files, encrypted such that only the senders and recipients can decrypt and view them with their identity (a wallet).
*   Recipients can sign the document using their wallet directly, which means, signatures are now transactions on a blockchain. Blockchain transactions are permanent records stored publicly with a unique hash, and can be verified by anyone.

### As of today, Filosign has the following capabilities:

*   **Wallet-Native Identity:** In web3, wallets are the primary way to prove ownership and take action. So it makes sense to use the exact same wallet to sign documents on your behalf. You can bring your own wallet, or sign up using a social provider like Google or X, and we will create one for you internally.
*   **Controlled Permissions:** You have full control over who you receive signing requests from. Senders have to add you as a contact and wait for you to accept before they can send a file, which completely prevents spam.
*   **End-to-End Encryption:** Your documents are encrypted right in your browser. Only you and your recipients hold the keys to decrypt and view the content. To us or anyone on the outside, the files are just gibberish.
*   **Decentralized Storage:** We store the encrypted documents on a decentralized service (Filecoin Onchain Cloud) instead of a centralized database. Being stored in this way, your files are always available, even if our own servers go down.
*   **On-Chain Proofs:** Signatures are permanent transactions on the blockchain. They are tamper-proof, and are stored publicly so anyone can independently verify them from anywhere.
*   **No Gas Required:** You can use the entire platform without needing anything more than a free account. We cover all the gas for users internally so you don't ever have to worry about it, just how it should be.
*   **Compliance Report:** For convenience, you can generate a proof packet (a PDF report) that contains all the details about the contract, including the specific on-chain transaction hashes for the signature. This is handy for legal purposes.

*Here is what a Filosign proof packet looks like:*

![image_1777432785623_0](https://cdn.filosign.ishtails.xyz/assets/proof.webp)

*This includes a record of who sent it, who signed it, when was it signed and the transaction hash for the signature.*

On Legality: By utilizing cryptographic identity and blockchain timestamps, Filosign is designed to satisfy the core requirements of frameworks like the ESIGN Act and eIDAS. We provide the mathematical proof; you provide the intent.

## Programmable Settlement

Because of this chosen architecture, we can do some things that traditional platforms simply cannot: Programmable Settlement. Here is an example of what is possible:

Senders can attach incentives (like USDT) for signers directly to the document and the signer automatically receives those tokens in their wallet as soon as they sign. This is really powerful. It fundamentally unifies signatures and payments in single flow and changes how high-stakes or sensitive work gets done. Consider the following examples:

*   **Cross-Border Payouts:** Contractors / Freelancers across the globe can sign a final handover agreement and instantly receives their payment, eliminating invoice delays and wire fees.
*   **Open Source and DAO Grants:** Developers signing a milestone document to automatically unlock treasury funds.

During the past six months, Filosign has evolved a lot, thanks to all the people who nudged us in the right direction and believed in our vision. We have kept building it quietly until now, trying to get the core right and now we need your feedback to make it perfect!

So today, we are releasing the public beta for Filosign for you to try, test and break. You can get started by connecting your social account or your wallet if you have one. Nothing else required. Send a file to a friend, attach incentives, sign a doc, and tell us what breaks or is missing so we can fix it.

We are excited to hear what you think about it, what features do you want, or any issues you face while trying to use it. We will use this feedback to improve the platform!

Here's the link: [staging.filosign.xyz](http://staging.filosign.xyz)

> Note: Filosign is currently in Beta and is deployed on a testnet (Base Sepolia). The incentives you attach to documents here is just testnet tokens (tUSDT) that you can claim from free faucets to play with, and any files you uploads may get wiped out in future. This environment is a playground for you to test the app without any financial risk or permanent record. Everything functions exactly how it will on the real blockchain so you can try all the features and see if it is for you. A stable mainnet launch with permanent storage will follow soon.
`,
	},
};

export const blogPost = blogPosts["post-1"];
