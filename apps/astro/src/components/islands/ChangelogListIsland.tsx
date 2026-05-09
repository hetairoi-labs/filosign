import { motion } from "motion/react";
import type { ChangelogEntry } from "../../content/changelog";

const badgeBase =
	"inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-sm font-normal bg-muted/50 text-muted-foreground";

function typeDot(type: ChangelogEntry["type"]) {
	switch (type) {
		case "Feature":
			return "bg-blue-400";
		case "Enhancement":
			return "bg-purple-400";
		case "Fix":
			return "bg-orange-400";
		default:
			return "bg-gray-400";
	}
}

interface ChangelogListIslandProps {
	entries: ChangelogEntry[];
}

export default function ChangelogListIsland({
	entries,
}: ChangelogListIslandProps) {
	return (
		<section className="py-20 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-5xl mx-auto space-y-24">
				{entries.map((entry, index) => (
					<motion.div
						key={entry.id}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: index * 0.1 }}
						className="grid md:grid-cols-[200px_1fr] gap-8"
					>
						<div className="text-muted-foreground font-medium text-sm md:text-right pt-1 font-manrope">
							{entry.date}
						</div>

						<div className="space-y-6">
							<div className="flex items-center gap-2">
								<div className={badgeBase}>
									<span
										className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${typeDot(entry.type)}`}
									/>
									{entry.type}
								</div>
							</div>

							<div className="space-y-4">
								<h2 className="text-3xl font-medium font-manrope tracking-tight text-foreground">
									{entry.title}
								</h2>
								<div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
									{entry.description.map((paragraph, i) => (
										<p key={`${entry.id}-${i}`}>{paragraph}</p>
									))}
								</div>
							</div>

							{entry.image ? (
								<div className="relative rounded-3xl overflow-hidden w-full aspect-video bg-secondary mt-8">
									<img
										src={entry.image}
										alt={entry.title}
										className="relative inset-0 w-full h-full object-cover p-4 rounded-4xl"
									/>
								</div>
							) : null}
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
