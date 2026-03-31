import {
	AlienIcon,
	AtomIcon,
	BuildingsIcon,
	CoinIcon,
	CubeIcon,
	DatabaseIcon,
	GlobeHemisphereWestIcon,
	HexagonIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

const companies = [
	{
		slug: "gitcoin",
		name: "Gitcoin",
		icon: CoinIcon,
	},
	{
		slug: "filecoin-foundation",
		name: "Filecoin Foundation",
		icon: DatabaseIcon,
	},
	{
		slug: "hedera-hashgraph",
		name: "Hedera Hashgraph",
		icon: HexagonIcon,
	},
	{
		slug: "aragon",
		name: "Aragon",
		icon: GlobeHemisphereWestIcon,
	},
	{
		slug: "matter-labs",
		name: "Matter Labs",
		icon: AtomIcon,
	},
	{
		slug: "metaplex",
		name: "Metaplex",
		icon: CubeIcon,
	},
	{
		slug: "towns",
		name: "Towns",
		icon: BuildingsIcon,
	},
	{
		slug: "near",
		name: "Near",
		icon: AlienIcon,
	},
];

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string;
	reverse?: boolean;
	children?: React.ReactNode;
	vertical?: boolean;
	repeat?: number;
}

const Marquee = ({
	className,
	reverse,
	children,
	vertical = false,
	repeat = 4,
	...props
}: MarqueeProps) => {
	return (
		<div
			{...props}
			className={cn(
				"group flex overflow-hidden p-2 [--gap:4rem] [gap:var(--gap)]",
				{
					"flex-row": !vertical,
					"flex-col": vertical,
				},
				className,
			)}
		>
			{Array(repeat)
				.fill(0)
				.map(() => (
					<motion.div
						key={`marquee-repeat-${repeat}-${vertical ? "vertical" : "horizontal"}`}
						className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
							"flex-row": !vertical,
							"flex-col": vertical,
						})}
						animate={{
							x: vertical
								? 0
								: reverse
									? ["calc(-100% - var(--gap))", "0%"]
									: ["0%", "calc(-100% - var(--gap))"],
							y: vertical
								? reverse
									? ["calc(-100% - var(--gap))", "0%"]
									: ["0%", "calc(-100% - var(--gap))"]
								: 0,
						}}
						transition={{
							duration: 20,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
						}}
					>
						{children}
					</motion.div>
				))}
		</div>
	);
};

export default function TrustedCompanies() {
	return (
		<section className="w-full py-12">
			<div className="container px-4 md:px-6 mx-auto">
				<div className="flex flex-col items-center justify-center gap-4 text-center">
					<p className="text-muted-foreground text-md font-medium font-manrope">
						Trusted by 100+ Leading Tech Companies
					</p>

					<div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-background">
						<Marquee className="[--duration:80s]">
							{companies.map((company) => (
								<div
									key={company.slug}
									className="flex items-center gap-2 text-muted-foreground/80 hover:text-foreground transition-colors px-8"
								>
									<company.icon className="h-6 w-6" weight="fill" />
									<span className="text-xl font-manrope font-medium tracking-tight">
										{company.name}
									</span>
								</div>
							))}
						</Marquee>

						<div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background dark:from-background" />
						<div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background dark:from-background" />
					</div>
				</div>
			</div>
		</section>
	);
}
