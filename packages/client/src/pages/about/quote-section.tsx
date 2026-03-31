import { LightningIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Image } from "@/src/lib/components/custom/Image";

export default function QuoteSection() {
	return (
		<section className="py-24 my-20 px-4 md:px-8 bg-card">
			<div className="max-w-4xl mx-auto text-center flex flex-col items-center justify-center space-y-12">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-card-foreground border border-border"
				>
					<span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
						<LightningIcon weight="fill" className="h-3.5 w-3.5" />
					</span>
					<span className="text-primary-foreground">filosign</span>
				</motion.div>

				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="text-3xl sm:text-4xl md:text-5xl font-medium leading-tight tracking-tight font-manrope text-foreground"
				>
					<blockquote>
						"We started Filosign with one mission: To revolutionize the
						traditional centralized document signing infrastructure and replace
						the trust with trustless, modern, privacy-centric, and
						mathematically verified foundation."
					</blockquote>
				</motion.h2>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.4 }}
					className="flex flex-col items-center space-y-4"
				>
					<div className="flex flex-col items-center">
						<Image
							src="/static/kartik.jpeg"
							alt="Kartikay"
							width={100}
							height={100}
							className="rounded-full"
						/>
						<span className="text-sm mt-4 font-semibold text-foreground uppercase tracking-wide">
							Kartik
						</span>
						<span className="text-sm text-muted-foreground">
							Co-Founder & CEO, Filosign
						</span>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
