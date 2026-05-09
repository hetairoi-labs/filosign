import { CheckIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Switch } from "@/src/lib/components/ui/switch";
import { cn } from "@/src/lib/utils";

type Plan = {
	name: string;
	description: string;
	price: {
		monthly: number;
		yearly: number;
	};
	features: string[];
	cta: string;
	highlight?: boolean;
	badge?: string;
};

const plans: Plan[] = [
	{
		name: "Free",
		description:
			"For individuals just getting started with decentralized signing.",
		price: {
			monthly: 0,
			yearly: 0,
		},
		features: [
			"Up to 3 documents per month",
			"Basic wallet integration",
			"Filecoin storage (1GB)",
			"Email support",
		],
		cta: "Get started",
	},
	{
		name: "Starter",
		description: "For freelancers and pro users who need more flexibility.",
		price: {
			monthly: 19,
			yearly: 15,
		},
		features: [
			"Up to 50 documents per month",
			"Custom branding",
			"Priority wallet support",
			"Filecoin storage (10GB)",
			"Audit trails",
		],
		cta: "Start 7-day free trial",
		highlight: false,
	},
	{
		name: "Pro",
		description: "For growing teams requiring advanced collaboration features.",
		price: {
			monthly: 49,
			yearly: 39,
		},
		features: [
			"Unlimited documents",
			"Team management",
			"API access",
			"Filecoin storage (100GB)",
			"Priority support",
			"Advanced analytics",
		],
		cta: "Start 7-day free trial",
		highlight: true,
		badge: "Most popular",
	},
	{
		name: "Enterprise",
		description: "For large organizations needing custom security and scale.",
		price: {
			monthly: 199,
			yearly: 169,
		},
		features: [
			"Custom contract limits",
			"SSO & dedicated success manager",
			"On-premise deployment options",
			"Unlimited storage",
			"SLA guarantees",
		],
		cta: "Chat with us!",
	},
];

export default function PricingSection() {
	const [isYearly, setIsYearly] = useState(true);

	return (
		<section className="py-20 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-7xl mx-auto">
				{/* Toggle */}
				<div className="flex items-center justify-center gap-4 mb-16">
					<span
						className={cn(
							"text-sm font-medium font-manrope transition-colors",
							!isYearly ? "text-foreground" : "text-muted-foreground",
						)}
					>
						Monthly
					</span>
					<Switch checked={isYearly} onCheckedChange={setIsYearly} />
					<span
						className={cn(
							"text-sm font-medium font-manrope transition-colors flex items-center gap-2",
							isYearly ? "text-foreground" : "text-muted-foreground",
						)}
					>
						Yearly{" "}
						<span className="text-xs text-secondary-foreground bg-secondary px-2 py-0.5 rounded-full">
							Save 15%
						</span>
					</span>
				</div>

				{/* Cards Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
					{plans.map((plan, index) => (
						<motion.div
							key={plan.name}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className={cn(
								"relative flex flex-col p-8 rounded-3xl transition-all duration-300",
								plan.highlight
									? "bg-background border-2 border-foreground text-foreground shadow-xl scale-[1.02] z-10"
									: "bg-muted/30 border border-transparent hover:border-border/50",
							)}
						>
							{plan.highlight && plan.badge && (
								<div className="absolute -top-5 left-0 right-0 mx-auto w-fit bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
									{plan.badge}
								</div>
							)}

							{/* Header Section: Name & Description */}
							<div className="mb-4 flex flex-col">
								<div className="inline-block w-fit px-3 py-1 rounded-full bg-background border border-border text-xs font-medium mb-4">
									{plan.name}
								</div>
								<p className="text-sm text-muted-foreground min-h-[3rem] font-manrope leading-relaxed">
									{plan.description}
								</p>
							</div>

							{/* Price Section */}
							<div className="mb-8 min-h-[84px] flex flex-col justify-end">
								<div className="flex items-baseline gap-1">
									<span className="text-4xl font-medium font-manrope">
										${isYearly ? plan.price.yearly : plan.price.monthly}
									</span>
									<span className="text-sm text-muted-foreground">USD</span>
								</div>
								<div className="text-sm text-muted-foreground mt-1">
									/month {plan.name !== "Free" && "for one user"}
								</div>
							</div>

							{/* CTA Button */}
							<div className="mb-8">
								<Button
									variant={plan.highlight ? "secondary" : "primary"}
									size="lg"
									className="w-full h-10 font-medium rounded-lg transition-colors"
								>
									{plan.cta}
								</Button>
							</div>

							{/* Features List - Pushed to fill remaining space but starts at same level due to fixed heights above */}
							<div className="flex-grow">
								<ul className="space-y-3">
									{plan.features.map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-3 text-sm text-muted-foreground font-manrope"
										>
											<CheckIcon
												className="size-4 shrink-0 text-foreground mt-0.5"
												weight="bold"
											/>
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
