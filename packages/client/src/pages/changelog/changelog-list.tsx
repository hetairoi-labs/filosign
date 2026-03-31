import { motion } from "motion/react";
import { ChangelogEntries } from "@/src/content/changelog";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";

export default function ChangelogList() {
	return (
		<section className="py-20 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-5xl mx-auto space-y-24">
				{ChangelogEntries.map((entry, index) => (
					<motion.div
						key={entry.id}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: index * 0.1 }}
						className="grid md:grid-cols-[200px_1fr] gap-8"
					>
						{/* Date Column */}
						<div className="text-muted-foreground font-medium text-sm md:text-right pt-1 font-manrope">
							{entry.date}
						</div>

						{/* Content Column */}
						<div className="space-y-6">
							<div className="flex items-center gap-2">
								<Badge
									variant="secondary"
									className="bg-muted/50 text-muted-foreground hover:bg-muted/60 font-normal px-2.5 py-0.5 h-auto"
								>
									<span
										className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
											entry.type === "Feature"
												? "bg-blue-400"
												: entry.type === "Enhancement"
													? "bg-purple-400"
													: "bg-orange-400"
										}`}
									/>
									{entry.type}
								</Badge>
							</div>

							<div className="space-y-4">
								<h2 className="text-3xl font-medium font-manrope tracking-tight text-foreground">
									{entry.title}
								</h2>
								<div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
									{entry.description.map((paragraph, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static content
										<p key={i}>{paragraph}</p>
									))}
								</div>
							</div>

							{entry.image && (
								<div className="relative rounded-3xl overflow-hidden w-full aspect-video bg-secondary mt-8">
									<Image
										src={entry.image}
										alt={entry.title}
										className="relative inset-0 w-full h-full object-cover p-4 rounded-4xl"
									/>
								</div>
							)}
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
