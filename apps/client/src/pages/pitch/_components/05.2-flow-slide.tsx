import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Image } from "@/src/lib/components/custom/Image";

export function FlowSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page relative overflow-hidden"
		>
			<motion.div
				className="text-center z-10 mb-8"
				initial={{ opacity: 0, y: -20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<h2 className="text-5xl md:text-6xl font-bold">
					Document Sharing Flow
				</h2>
				<p className="text-lg text-muted-foreground mt-4 max-w-[90dvw] mx-auto">
					An overview of the end-to-end process for securely signing and storing
					a document.
				</p>
			</motion.div>

			<motion.div
				className="z-10 mt-4 bg-[#f8f8f8] rounded-large"
				initial={{ opacity: 0, y: 20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<Image
					src="/image_1.webp"
					alt="Complete document flow"
					width={1200}
					height={600}
					className="rounded-large border-2 border-border object-contain max-h-[60vh] max-w-[90dvw]"
				/>
			</motion.div>
		</div>
	);
}
