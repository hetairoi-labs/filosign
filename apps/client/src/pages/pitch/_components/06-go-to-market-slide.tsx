import {
	ChatsIcon,
	type Icon,
	RocketIcon,
	StorefrontIcon,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const phases: { title: string; description: string; icon: Icon }[] = [
	{
		title: "Phase 1: Validation",
		description:
			"Targeted customer discovery interviews with CTOs and compliance officers to validate the MVP.",
		icon: ChatsIcon,
	},
	{
		title: "Phase 2: Product-Led Growth",
		description:
			"A tiered subscription model to drive bottom-up adoption and gather user feedback.",
		icon: RocketIcon,
	},
	{
		title: "Phase 3: Enterprise Sales",
		description:
			"Building direct sales channels to target startups and enterprise clients with high-value needs.",
		icon: StorefrontIcon,
	},
];

export function GoToMarketSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page relative overflow-hidden"
		>
			<div className="text-center z-10 mb-24">
				<motion.h2
					className="text-5xl md:text-6xl font-bold"
					initial={{ opacity: 0, y: -20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					Go-To-Market Strategy
				</motion.h2>
				<motion.p
					className="text-lg text-muted-foreground mt-4 max-w-[90dvw] mx-auto"
					initial={{ opacity: 0, y: -20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					A phased approach to validate, grow, and scale.
				</motion.p>
			</div>

			<div className="relative w-full max-w-[90dvw] z-10">
				{/* Timeline */}
				<div className="absolute top-12 left-0 w-full h-1 bg-border -translate-y-1/2">
					<motion.div
						className="h-full bg-primary"
						initial={{ width: 0 }}
						animate={inView ? { width: "100%" } : {}}
						transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
					/>
				</div>

				<div className="flex justify-between">
					{phases.map((phase, i) => (
						<motion.div
							key={phase.title}
							className="flex flex-col items-center gap-4 text-center relative"
							initial={{ opacity: 0, y: 50 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.4, delay: 0.4 + i * 0.2 }}
						>
							<div className="p-4 bg-background border-4 border-primary rounded-full z-10">
								<phase.icon className="size-12 text-primary" weight="duotone" />
							</div>
							<div className="w-60 mt-4">
								<h3 className="text-xl font-semibold">{phase.title}</h3>
								<p className="text-muted-foreground text-sm">
									{phase.description}
								</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}
