import {
	CloudIcon,
	CodeIcon,
	CubeIcon,
	DatabaseIcon,
	type Icon,
	LaptopIcon,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const components: {
	title: string;
	description: string;
	icon: Icon;
}[] = [
	{
		title: "Frontend (React)",
		description:
			"User-facing interface where all cryptographic operations occur on the client-side.",
		icon: LaptopIcon,
	},
	{
		title: "FiloSign Server",
		description:
			"A lightweight service that orchestrates tasks like notifications and transaction preparation.",
		icon: DatabaseIcon,
	},
	{
		title: "FVM Smart Contracts",
		description:
			"The decentralized source of truth for all agreements, managing document state and signatures.",
		icon: CubeIcon,
	},
	{
		title: "Filecoin Onchain Cloud",
		description:
			"Provides permanent, decentralized storage for all encrypted documents.",
		icon: CloudIcon,
	},
];

export function HowItWorksSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page relative overflow-hidden"
		>
			<motion.div
				className="text-center z-10 mb-16"
				initial={{ opacity: 0, y: -20 }}
				animate={inView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<h2 className="text-5xl md:text-6xl font-bold">How It Works</h2>
				<p className="text-lg text-muted-foreground mt-4 max-w-[90dvw] mx-auto">
					A non-custodial platform where users have absolute control, built on a
					trustless architecture.
				</p>
			</motion.div>

			<div className="relative z-10">
				{components.map((component, i) => (
					<motion.div
						key={component.title}
						className="flex items-center gap-8 my-4"
						custom={i}
						initial="hidden"
						animate={inView ? "visible" : "hidden"}
						variants={{
							hidden: { opacity: 0, x: -30 },
							visible: { opacity: 1, x: 0 },
						}}
						transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
					>
						<div className="text-right">
							<h3 className="text-2xl font-semibold">{component.title}</h3>
							<p className="text-muted-foreground max-w-sm">
								{component.description}
							</p>
						</div>
						<div className="p-4 bg-primary/10 rounded-full">
							<component.icon
								className="size-10 text-primary"
								weight="duotone"
							/>
						</div>
					</motion.div>
				))}
				{/* Connecting line */}
				<div className="absolute top-0 right-[calc(100%_+_2rem)] w-1 h-full bg-border -z-10">
					<motion.div
						className="w-full bg-primary"
						initial={{ height: 0 }}
						animate={inView ? { height: "100%" } : {}}
						transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
					/>
				</div>
			</div>

			<motion.div
				className="absolute top-20 -right-40 z-0"
				initial={{ opacity: 0, scale: 0.5, y: 100 }}
				animate={inView ? { opacity: 0.05, scale: 1, y: 0 } : {}}
				transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
			>
				<CodeIcon className="size-[30rem] text-primary" weight="light" />
			</motion.div>
		</div>
	);
}
