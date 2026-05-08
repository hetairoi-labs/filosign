import {
	KeyIcon,
	PlusIcon,
	ShieldIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

export function SecuritySlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page relative overflow-hidden"
		>
			<div className="text-center z-10 mb-16">
				<motion.h2
					className="text-5xl md:text-6xl font-bold"
					initial={{ opacity: 0, y: -20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					Secure by Design
				</motion.h2>
				<motion.p
					className="text-lg text-muted-foreground mt-4 max-w-[90dvw] mx-auto"
					initial={{ opacity: 0, y: -20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					Our platform is fully non-custodial, with wallet-based identity and
					local PIN-protected seed storage.
				</motion.p>
			</div>

			<div className="flex flex-col md:flex-row items-center justify-center gap-8 z-10">
				<motion.div
					className="flex flex-col items-center gap-4 p-8 rounded-large bg-card/50 w-80 h-80 justify-center"
					initial={{ opacity: 0, scale: 0.8, x: -50 }}
					animate={inView ? { opacity: 1, scale: 1, x: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
				>
					<WalletIcon className="size-24 text-primary" weight="duotone" />
					<h3 className="text-2xl font-semibold">Web3 Wallet</h3>
					<p className="text-muted-foreground text-center">
						Something you have.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={inView ? { opacity: 1, scale: 1 } : {}}
					transition={{ duration: 0.3, delay: 0.4 }}
				>
					<PlusIcon className="size-16 text-muted-foreground" weight="light" />
				</motion.div>

				<motion.div
					className="flex flex-col items-center gap-4 p-8 rounded-large bg-card/50 w-80 h-80 justify-center"
					initial={{ opacity: 0, scale: 0.8, x: 50 }}
					animate={inView ? { opacity: 1, scale: 1, x: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
				>
					<KeyIcon className="size-24 text-primary" weight="duotone" />
					<h3 className="text-2xl font-semibold">Your PIN</h3>
					<p className="text-muted-foreground text-center">
						Something you know.
					</p>
				</motion.div>
			</div>

			<motion.div
				className="absolute bottom-10 text-center z-10"
				initial={{ opacity: 0, y: 20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.6 }}
			>
				<p className="text-lg text-muted-foreground mt-4 max-w-[90dvw] mx-auto">
					Client-side encryption ensures that we never have access to your keys
					or unencrypted documents.
				</p>
			</motion.div>

			{/* Background decoration */}
			<motion.div
				className="absolute -bottom-20 -right-20 z-0"
				initial={{ opacity: 0, scale: 0.5 }}
				animate={inView ? { opacity: 0.05, scale: 1 } : {}}
				transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
			>
				<ShieldIcon className="size-[30rem] text-primary" weight="light" />
			</motion.div>
		</div>
	);
}
