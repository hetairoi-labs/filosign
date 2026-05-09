import {
	type Icon,
	LockKeyOpenIcon,
	ShieldWarningIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const problems: { title: string; description: string; icon: Icon }[] = [
	{
		title: "Platform Risk",
		description:
			"You must trust the provider's security, policies, and long-term viability.",
		icon: ShieldWarningIcon,
	},
	{
		title: "Central Point of Failure",
		description:
			"A provider outage or breach could compromise your most critical agreements.",
		icon: XCircleIcon,
	},
	{
		title: "Lack of Verifiability",
		description:
			"You can't independently verify the integrity of a document without relying on the platform.",
		icon: LockKeyOpenIcon,
	},
];

export function ProblemSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page text-center relative overflow-hidden"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.1 }}
				className="max-w-[90dvw] text-center z-10"
			>
				<h2 className="text-5xl md:text-6xl font-bold">
					The Problem with Centralized E-Signatures
				</h2>
				<p className="text-lg text-muted-foreground mt-4">
					Enterprises using centralized platforms are exposed to significant,
					unaddressed "platform risk."
				</p>
			</motion.div>

			<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[90dvw] z-10">
				{problems.map((problem, i) => (
					<motion.div
						key={problem.title}
						className="flex flex-col items-center gap-4 p-8 rounded-large bg-card/50"
						initial={{ opacity: 0, y: 30 }}
						animate={inView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.2, delay: 0.2 + i * 0.1 }}
					>
						<problem.icon className="size-16 text-primary" weight="duotone" />
						<h3 className="text-2xl font-semibold">{problem.title}</h3>
						<p className="text-muted-foreground">{problem.description}</p>
					</motion.div>
				))}
			</div>

			{/* Background decoration */}
			<motion.div
				className="absolute -bottom-40 -right-40 z-0"
				initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
				animate={inView ? { opacity: 0.1, scale: 1, rotate: 15 } : {}}
				transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
			>
				<XCircleIcon className="size-[40rem] text-muted" weight="light" />
			</motion.div>
		</div>
	);
}
