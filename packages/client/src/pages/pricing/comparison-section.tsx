import {
	CheckIcon,
	ClockCounterClockwiseIcon,
	CodeIcon,
	DatabaseIcon,
	FileTextIcon,
	GlobeHemisphereWestIcon,
	HardDrivesIcon,
	KeyIcon,
	LockKeyIcon,
	PaintBrushIcon,
	ShieldCheckIcon,
	SignatureIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Badge } from "@/src/lib/components/ui/badge";

type ComparisonFeature = {
	name: string;
	icon: React.ReactNode;
	values: (string | boolean | null)[]; // null for "-", true for checkmark
};

const features: ComparisonFeature[] = [
	{
		name: "Team Members",
		icon: <UsersIcon className="size-5" />,
		values: ["1 User", "3 Users", "Unlimited", "Unlimited"],
	},
	{
		name: "Documents per Month",
		icon: <FileTextIcon className="size-5" />,
		values: ["3 Docs", "50 Docs", "Unlimited", "Unlimited"],
	},
	{
		name: "Filecoin Storage",
		icon: <HardDrivesIcon className="size-5" />,
		values: ["1 GB", "10 GB", "100 GB", "Unlimited"],
	},
	{
		name: "Audit Trails",
		icon: <ClockCounterClockwiseIcon className="size-5" />,
		values: ["Basic", "Detailed", "Advanced", "Compliance Ready"],
	},
	{
		name: "Custom Branding",
		icon: <PaintBrushIcon className="size-5" />,
		values: [null, true, true, true],
	},
	{
		name: "API Access",
		icon: <CodeIcon className="size-5" />,
		values: [null, null, "10k req/mo", "Unlimited"],
	},
	{
		name: "Wallet Integration",
		icon: <KeyIcon className="size-5" />,
		values: ["Standard", "Priority", "Multi-chain", "Custom"],
	},
	{
		name: "Encrypted Storage",
		icon: <LockKeyIcon className="size-5" />,
		values: [true, true, true, true],
	},
	{
		name: "Custom Retention",
		icon: <DatabaseIcon className="size-5" />,
		values: [null, null, "1 Year", "Custom"],
	},
	{
		name: "SSO & Security",
		icon: <ShieldCheckIcon className="size-5" />,
		values: [null, null, null, true],
	},
	{
		name: "Global Compliance",
		icon: <GlobeHemisphereWestIcon className="size-5" />,
		values: [true, true, true, true],
	},
	{
		name: "Signature Types",
		icon: <SignatureIcon className="size-5" />,
		values: ["Draw/Type", "Upload", "All Types", "All + Hardware"],
	},
];

const plans = [
	{ name: "Free", label: "Get started" },
	{ name: "Starter", label: "Start trial" },
	{ name: "Pro", label: "Start trial", highlight: true, badge: "Most popular" },
	{ name: "Enterprise", label: "Contact us" },
];

export default function ComparisonSection() {
	return (
		<section className="py-20 px-4 md:px-8 lg:px-page bg-muted/10">
			<div className="max-w-7xl mx-auto">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-3xl md:text-4xl font-medium text-center font-manrope mb-16"
				>
					Compare plan features
				</motion.h2>

				<div className="overflow-x-auto pb-8 hide-scrollbar">
					<div className="min-w-[900px]">
						{/* Header Row */}
						<div className="grid grid-cols-5 gap-4 mb-12 px-4">
							<div /> {/* Empty first column for labels */}
							{plans.map((plan) => (
								<div
									key={plan.name}
									className="flex flex-col items-center gap-4"
								>
									<div className="flex items-center gap-2">
										<span className="font-medium text-2xl font-manrope">
											{plan.name}
										</span>
										{plan.highlight && (
											<Badge
												variant="secondary"
												className="bg-secondary/30 text-secondary-foreground hover:bg-secondary/40 text-[10px] px-2 py-0.5 h-auto"
											>
												{plan.badge}
											</Badge>
										)}
									</div>
								</div>
							))}
						</div>

						{/* Features Rows */}
						<div className="space-y-0">
							{features.map((feature, index) => (
								<motion.div
									key={feature.name}
									initial={{ opacity: 0, y: 10 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.3, delay: index * 0.1 }}
									className="grid grid-cols-5 gap-4 py-6 px-4 border-t border-border/40 hover:bg-muted/30 transition-colors group"
								>
									{/* Feature Name */}
									<div className="flex items-center gap-3 text-muted-foreground font-medium font-manrope group-hover:text-foreground transition-colors">
										{feature.icon}
										{feature.name}
									</div>

									{/* Values */}
									{feature.values.map((value) => (
										<div
											key={value?.toString()}
											className="flex items-center justify-center text-sm font-manrope"
										>
											{value === true ? (
												<CheckIcon
													className="size-5 text-foreground"
													weight="bold"
												/>
											) : value === null ? (
												<span className="text-muted-foreground/30">-</span>
											) : (
												<span className="text-foreground font-medium">
													{value}
												</span>
											)}
										</div>
									))}
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
