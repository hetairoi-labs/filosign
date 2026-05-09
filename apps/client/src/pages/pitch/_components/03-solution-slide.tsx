import {
	CheckCircleIcon,
	ClockClockwiseIcon,
	type Icon,
	SignatureIcon,
	StampIcon,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const solutions: { title: string; description: string; icon: Icon }[] = [
	{
		title: "Irrevocable Signatures",
		description:
			"Every signature is a permanent transaction on the Filecoin Virtual Machine (FVM).",
		icon: SignatureIcon,
	},
	{
		title: "Permanent Anchorage",
		description:
			"The document's hash is anchored to the Filecoin network, creating a tamper-proof record.",
		icon: StampIcon,
	},
	{
		title: "Verifiable Audit Trail",
		description:
			"A time-stamped and independently verifiable audit trail that exists outside any single entity's control.",
		icon: ClockClockwiseIcon,
	},
];

export function SolutionSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page relative overflow-hidden"
		>
			{/* Background decoration */}
			<motion.div
				className="absolute -bottom-60 -left-60 z-0"
				initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
				animate={inView ? { opacity: 0.05, scale: 1, rotate: -15 } : {}}
				transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
			>
				<CheckCircleIcon className="size-[50rem] text-primary" weight="light" />
			</motion.div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center z-10 max-w-[90dvw]">
				<motion.div
					initial={{ opacity: 0, x: -30 }}
					animate={inView ? { opacity: 1, x: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<h2 className="text-5xl md:text-6xl font-bold">
						The Solution: Mathematical Proof
					</h2>
					<p className="text-lg text-muted-foreground mt-4">
						We replace fragile platform trust with permanent, verifiable
						mathematical proof. Your agreements are safe from hacks, policy
						changes, or provider shutdowns.
					</p>
				</motion.div>

				<div className="flex flex-col gap-8">
					{solutions.map((solution, i) => (
						<motion.div
							key={solution.title}
							className="flex items-start gap-6"
							initial={{ opacity: 0, x: 30 }}
							animate={inView ? { opacity: 1, x: 0 } : {}}
							transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
						>
							<div className="p-3 bg-primary/10 rounded-full">
								<solution.icon
									className="size-8 text-primary"
									weight="duotone"
								/>
							</div>
							<div>
								<h3 className="text-2xl font-semibold">{solution.title}</h3>
								<p className="text-muted-foreground">{solution.description}</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}
