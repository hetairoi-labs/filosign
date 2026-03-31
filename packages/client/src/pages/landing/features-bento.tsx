import {
	ChartBarIcon,
	CheckCircleIcon,
	QrCodeIcon,
	ShieldCheckIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";

type BentoCardConfig = {
	title: string;
	description: string;
	cardClassName?: string;
	body: React.ReactNode;
};

function BentoCard({
	title,
	description,
	body,
	cardClassName,
}: BentoCardConfig) {
	return (
		<Card
			className={[
				"h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-2 md:p-4 flex flex-col",
				cardClassName ?? "",
			].join(" ")}
		>
			<CardHeader className="pb-4">
				<CardTitle className="text-2xl font-manrope font-light">
					{title}
				</CardTitle>
				<p className="text-muted-foreground text-sm leading-relaxed font-manrope font-light">
					{description}
				</p>
			</CardHeader>
			<CardContent className="p-6 pt-0 flex-1 flex flex-col justify-end">
				{body}
			</CardContent>
		</Card>
	);
}

export default function FeaturesBento() {
	const cards: BentoCardConfig[] = [
		{
			title: "Quantum-Safe Security",
			description:
				"Future-proof encryption using Dilithium crystals to protect your signatures against quantum threats.",
			body: (
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 w-full space-y-3.5 h-[192px] flex flex-col justify-center">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<ShieldCheckIcon className="size-5 text-primary" weight="fill" />
							<span className="text-sm font-medium font-manrope">
								Dilithium 3
							</span>
						</div>
						<span className="text-[10px] font-medium bg-secondary text-primary px-2.5 font-manrope py-1 rounded-full">
							Secure
						</span>
					</div>
					<div className="flex items-center justify-between opacity-40">
						<div className="flex items-center gap-3">
							<div className="size-5 rounded-full border border-foreground/30 flex items-center justify-center text-[10px] font-medium font-manrope">
								R
							</div>
							<span className="text-sm font-manrope">RSA-2048</span>
						</div>
						<span className="text-[10px] font-medium bg-muted text-muted-foreground px-2.5 font-manrope py-1 rounded-full">
							Legacy
						</span>
					</div>
					<div className="flex items-center justify-between opacity-40 pb-1">
						<div className="flex items-center gap-3">
							<div className="size-5 rounded-full border border-foreground/30 flex items-center justify-center text-[10px] font-medium font-manrope">
								E
							</div>
							<span className="text-sm font-manrope">ECDSA</span>
						</div>
						<span className="text-[10px] font-medium bg-muted text-muted-foreground px-2.5 font-manrope py-1 rounded-full">
							Legacy
						</span>
					</div>
				</div>
			),
		},
		{
			title: "Instant Verification",
			description:
				"Verify document authenticity instantly with our verifiable QR codes and on-chain proofs.",
			body: (
				<div className="bg-white p-5 rounded-2xl shadow-sm border border-border/40 w-full flex flex-col items-center h-[192px] justify-center">
					<div className="bg-white p-2 rounded-lg">
						<QrCodeIcon className="size-24 text-primary" weight="fill" />
					</div>
					<div className="w-full">
						<button
							type="button"
							className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium font-manrope hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
						>
							Verify Now
						</button>
					</div>
				</div>
			),
		},
		{
			title: "Organized Workspaces",
			description:
				"Keep your teams and data perfectly organized in separate workspaces.",
			body: (
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 w-full h-[192px] flex flex-col justify-center">
					<div className="space-y-2">
						<div className="flex items-center gap-4 p-3 bg-[#F2F9F0] rounded-xl relative overflow-hidden">
							<div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm font-manrope z-10">
								F
							</div>
							<div className="flex-1 z-10">
								<div className="text-sm font-semibold text-foreground font-manrope">
									Filosign Inc.
								</div>
								<div className="text-xs text-muted-foreground font-manrope">
									Enterprise
								</div>
							</div>
							<div className="size-12 rounded-full bg-primary flex items-center justify-center absolute -right-3 -bottom-3 z-0">
								<CheckCircleIcon
									className="text-white size-6 -ml-1 -mt-1"
									weight="bold"
								/>
							</div>
						</div>
						<div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/20 transition-colors opacity-60">
							<div className="size-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm font-manrope">
								L
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium font-manrope">
									Legal Team
								</div>
								<div className="text-xs text-muted-foreground font-manrope">
									Internal
								</div>
							</div>
						</div>
					</div>
				</div>
			),
		},
	];

	return (
		<section className="py-24 px-8 md:px-page max-w-7xl mx-auto">
			<div className="text-center mb-16 space-y-4">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-3xl md:text-5xl tracking-tight"
				>
					Your contracts working <br className="hidden md:block" />
					as hard as you do
				</motion.h2>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}
					className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-manrope font-light"
				>
					Automated workflows, quantum-safe security, and real-time insights.
				</motion.p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{cards.map((card, i) => (
					<motion.div
						key={card.title}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.2 + i * 0.1 }}
						className="md:col-span-1"
					>
						<BentoCard {...card} />
					</motion.div>
				))}

				{/* Card 4: Real-time Analytics */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.5 }}
					className="md:col-span-3"
				>
					<Card className="h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-2 md:p-4">
						<div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 items-center h-full">
							<div className="flex flex-col justify-center h-full space-y-4">
								<div className="flex items-center gap-2 text-primary mb-1">
									<ChartBarIcon className="size-5" />
									<span className="font-medium text-sm font-manrope">
										Analytics
									</span>
								</div>
								<CardTitle className="text-2xl md:text-3xl font-manrope font-light">
									Real-time status tracking with actionable insights
								</CardTitle>
								<p className="text-muted-foreground text-base leading-relaxed font-manrope font-light">
									Automated audit trails, instant reconciliation, and detailed
									analytics for all your envelopes.
								</p>
							</div>

							<div className="bg-white rounded-2xl p-6 shadow-sm border border-border/40 w-full">
								<div className="flex items-center justify-between mb-8">
									<div>
										<div className="text-sm text-muted-foreground font-medium font-manrope">
											Total Signed
										</div>
										<div className="text-3xl mt-1 font-manrope">1,257</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-muted-foreground font-medium font-manrope">
											Completion Rate
										</div>
										<div className="text-3xl text-primary mt-1 font-manrope">
											94%
										</div>
									</div>
								</div>

								{/* Simple CSS Chart */}
								<div className="h-40 flex items-end justify-between gap-2 md:gap-4">
									{[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: static array
											key={i}
											className="w-full bg-secondary/80 rounded-t-lg relative group overflow-hidden"
											style={{ height: `${height}%` }}
										>
											<div
												className="absolute bottom-0 left-0 w-full bg-primary rounded-t-lg transition-all duration-700 ease-out"
												style={{ height: `${height * 0.6}%` }}
											/>
										</div>
									))}
								</div>
								<div className="flex justify-between mt-4 text-[10px] font-medium uppercase text-muted-foreground/70 tracking-wider">
									<span>Jan</span>
									<span>Feb</span>
									<span>Mar</span>
									<span>Apr</span>
									<span>May</span>
									<span>Jun</span>
									<span>Jul</span>
								</div>
							</div>
						</div>
					</Card>
				</motion.div>
			</div>
		</section>
	);
}
