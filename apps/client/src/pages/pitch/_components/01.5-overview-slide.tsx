import { FileTextIcon } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

export function OverviewSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page text-center relative overflow-hidden"
		>
			<motion.div
				className="text-center z-10"
				initial={{ opacity: 0, y: 20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<h2 className="text-5xl md:text-6xl font-bold">What is FiloSign?</h2>
				<p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-[90dvw] md:max-w-4xl mx-auto leading-relaxed">
					FiloSign is a decentralized, on-chain e-signature platform. It allows
					enterprises to sign and store agreements with mathematical certainty,
					creating a permanent and verifiable record on the Filecoin Onchain
					Cloud. The platform offers a user experience similar to centralized
					services like DocuSign but with enhanced security and permanence.
				</p>
			</motion.div>

			{/* Background decoration */}
			<motion.div
				className="absolute -bottom-40 -left-40 z-0"
				initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
				animate={inView ? { opacity: 0.05, scale: 1, rotate: -10 } : {}}
				transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
			>
				<FileTextIcon className="size-[40rem] text-primary" weight="light" />
			</motion.div>
		</div>
	);
}
