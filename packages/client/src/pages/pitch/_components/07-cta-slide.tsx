import { CaretRightIcon } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Button } from "@/src/lib/components/ui/button";

export function CtaSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.5 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page text-center bg-grid-small-black/[0.2] relative"
		>
			<div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.3, delay: 0.1 }}
				className="z-10"
			>
				<h1 className="text-7xl md:text-8xl font-bold">
					Ready to get started?
				</h1>
				<p className="text-lg md:text-2xl text-muted-foreground mt-4 max-w-4xl">
					Secure your most important agreements with the power of the
					blockchain.
				</p>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.4, delay: 0.2 }}
				>
					<Button
						variant="primary"
						className="mt-8"
						render={
							<a
								href="https://www.notion.so/Filosign-26192d4e656980598eecee819b543c97?source=copy_link"
								target="_blank"
								className="flex items-center gap-2 group text-2xl p-8 rounded-large"
								rel="noopener"
							>
								Learn More
								<CaretRightIcon className="w-6 h-6 transition-transform duration-200 group-hover:translate-x-1" />
							</a>
						}
					/>
				</motion.div>
			</motion.div>
		</div>
	);
}
