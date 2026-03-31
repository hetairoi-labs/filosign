import {
	InfinityIcon,
	LockKeyIcon,
	ShieldCheckIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";

type ValueItem =
	| {
			type: "text";
			title:
				| "Trustless Security"
				| "User Sovereignty"
				| "Seamless Experience"
				| "Built for Forever";
			description: string;
			icon: React.ReactNode;
	  }
	| {
			type: "image";
			src: string;
			alt: string;
	  };

const values: ValueItem[] = [
	{
		type: "text",
		title: "Trustless Security",
		description:
			"Building on decentralized networks to ensure your documents are verifiable and tamper-proof, removing the need for blind trust.",
		icon: <ShieldCheckIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/static/images/stock_2.webp",
		alt: "Team member working",
	},
	{
		type: "text",
		title: "User Sovereignty",
		description:
			"You own your data. Our non-custodial architecture means we never hold your private keys or document contents.",
		icon: <LockKeyIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/static/images/stock_1.webp",
		alt: "Team collaboration",
	},
	{
		type: "image",
		src: "/static/images/stock_4.webp",
		alt: "Office environment",
	},
	{
		type: "text",
		title: "Seamless Experience",
		description:
			"Complex cryptography under the hood, simple interface on the surface. We make Web3 signing accessible to everyone.",
		icon: <UsersThreeIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/static/images/stock_6.webp",
		alt: "Discussion",
	},
	{
		type: "text",
		title: "Built for Forever",
		description:
			"Storage on Filecoin ensures your documents are preserved permanently and reliably, independent of any single entity.",
		icon: <InfinityIcon className="size-6" />,
	},
];

export default function ValuesSection() {
	return (
		<section className="py-24 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col items-center text-center mb-16 space-y-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
					>
						<Badge
							variant="secondary"
							className="bg-secondary/50 hover:bg-secondary/60 text-secondary-foreground"
						>
							<UsersThreeIcon className="mr-1 size-3" />
							Our values
						</Badge>
					</motion.div>

					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight max-w-3xl mx-auto font-manrope"
					>
						We're founders who think privacy should be a fundamental right!
					</motion.h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{values.map((item, index) => (
						<motion.div
							key={item.type === "text" ? item.title : item.src}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className={`relative overflow-hidden rounded-3xl h-[360px] md:h-[420px] group ${
								item.type === "text"
									? "bg-muted/30 p-8 flex flex-col justify-between"
									: ""
							}`}
						>
							{item.type === "text" ? (
								<>
									<div className="space-y-4">
										<div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm text-foreground">
											{item.icon}
										</div>
										<h3 className="text-xl font-semibold font-manrope">
											{item.title}
										</h3>
									</div>
									<p className="text-muted-foreground leading-relaxed">
										{item.description}
									</p>
								</>
							) : (
								<Image
									src={item.src}
									alt={item.alt}
									width={400}
									height={500}
									className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
								/>
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
