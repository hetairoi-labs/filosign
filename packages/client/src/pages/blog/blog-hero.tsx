import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Image } from "@/src/lib/components/custom/Image";
import { Button } from "@/src/lib/components/ui/button";

export default function BlogHero() {
	return (
		<section className="pt-32 pb-20 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-7xl mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
					{/* Text Content */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5 }}
						className="space-y-6"
					>
						<div className="text-sm font-medium text-muted-foreground">
							Jan 6, 2025
						</div>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground leading-[1.1]">
							Introducing Filosign
						</h1>
						<p className="text-lg text-muted-foreground">
							Six months ago, we started working on Filosign to build a
							completely private and end-to-end encrypted document signing
							standard. Today, we're launching it to the public.
						</p>
						<div className="pt-4">
							<Button
								asChild
								variant="primary"
								size="lg"
								className="rounded-full px-8"
							>
								<Link
									to="/blog/$postId"
									params={{
										postId: "introduction",
									}}
								>
									Read article
								</Link>
							</Button>
						</div>
					</motion.div>

					{/* Featured Image */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="relative rounded-3xl overflow-hidden aspect-[4/3] lg:aspect-[5/4]"
					>
						<Image
							src="/static/images/stock_4.webp"
							alt="Woman working on laptop"
							width={1280}
							height={720}
							className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
						/>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
