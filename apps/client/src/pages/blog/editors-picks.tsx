import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

type Category = "All" | "Articles" | "Customer Stories" | "Filosign News";

type BlogPost = {
	id: string;
	title: string;
	date: string;
	category: Category;
	excerpt?: string;
	image: string;
	slug: string;
};

const categories: Category[] = [
	"All",
	"Articles",
	"Customer Stories",
	"Filosign News",
];

const featuredPost: BlogPost = {
	id: "featured-1",
	title: "Introducing Filosign",
	date: "Apr 29, 2026",
	category: "Filosign News",
	excerpt:
		"Six months ago, we started working on Filosign to build a completely private and end-to-end encrypted document signing standard.",
	image: "/images/stock_1.webp",
	slug: "/blog/introducing-filosign",
};

const recentPosts: BlogPost[] = [
	{
		id: "post-2",
		title:
			"The rise of cryptographic signatures: A founder's guide to modern agreement",
		date: "Jan 11, 2025",
		category: "Customer Stories",
		image: "/images/stock_5.webp",
		slug: "/blog/post-2",
	},
	{
		id: "post-3",
		title:
			"Filosign expands to Asian markets, appoints former Polygon exec as Regional Director",
		date: "Jan 10, 2025",
		category: "Filosign News",
		image: "/images/stock_7.webp",
		slug: "/blog/post-3",
	},
	{
		id: "post-4",
		title:
			"From bootstrapped to market leader: How GreenChain scaled sustainable supply chains with Filosign",
		date: "Jan 10, 2025",
		category: "Customer Stories",
		image: "/images/stock_8.webp",
		slug: "/blog/post-4",
	},
	{
		id: "post-5",
		title:
			"Understanding Zero-Knowledge Proofs in Document Verification: A Technical Deep Dive",
		date: "Jan 09, 2025",
		category: "Articles",
		image: "/images/stock_2.webp",
		slug: "/blog/post-5",
	},
];

export default function EditorsPicks() {
	const [activeCategory, setActiveCategory] = useState<Category>("All");

	return (
		<section className="py-28 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-7xl mx-auto">
				<div className="space-y-8 mb-12">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="text-3xl md:text-4xl font-medium font-manrope tracking-tight"
					>
						Editor's picks
					</motion.h2>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="flex flex-wrap gap-2"
					>
						{categories.map((category) => (
							<button
								key={category}
								onClick={() => setActiveCategory(category)}
								type="button"
								className={cn(
									"px-4 py-2 rounded-full text-sm font-light transition-all duration-200",
									activeCategory === category
										? "bg-foreground text-background"
										: "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
								)}
							>
								{category}
							</button>
						))}
					</motion.div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12">
					{/* Featured Post (Left Side) */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="lg:col-span-7 flex flex-col gap-6 group cursor-pointer"
					>
						{/* Image Container - Fixed height ratio */}
						<div className="relative rounded-3xl overflow-hidden w-full aspect-[16/10] bg-muted">
							<Image
								src={featuredPost.image}
								alt={featuredPost.title}
								width={800}
								height={600}
								className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
							/>
						</div>
						{/* Content */}
						<div className="space-y-4">
							<Badge
								variant="secondary"
								className="bg-secondary/30 text-secondary-foreground hover:bg-secondary/40 w-fit"
							>
								{featuredPost.category}
							</Badge>
							<h3 className="text-2xl md:text-4xl font-medium font-manrope leading-tight tracking-tight group-hover:text-muted-foreground transition-colors">
								{featuredPost.title}
							</h3>
							<p className="text-muted-foreground leading-relaxed line-clamp-3 text-lg">
								{featuredPost.excerpt}
							</p>
						</div>
					</motion.div>

					{/* Recent Posts List (Right Side) */}
					<div className="lg:col-span-5 flex flex-col h-full">
						<div className="flex-1 flex flex-col gap-8">
							{recentPosts.map((post, index) => (
								<motion.div
									key={post.id}
									initial={{ opacity: 0, x: 20 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
									className="flex gap-6 group cursor-pointer"
								>
									<div className="relative rounded-xl overflow-hidden w-40 aspect-[4/3] shrink-0 bg-muted">
										<Image
											src={post.image}
											alt={post.title}
											width={200}
											height={150}
											className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
										/>
									</div>
									<div className="flex flex-col gap-2 py-1">
										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className="text-[10px] px-2 py-0.5 h-auto border-border text-muted-foreground font-normal"
											>
												{post.category}
											</Badge>
										</div>
										<h4 className="text-lg font-medium font-manrope leading-snug group-hover:text-muted-foreground transition-colors line-clamp-3">
											{post.title}
										</h4>
										<span className="text-xs text-muted-foreground mt-auto">
											{post.date}
										</span>
									</div>
								</motion.div>
							))}
						</div>

						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.6 }}
							className="mt-8"
						>
							<Button
								variant="outline"
								className="w-full h-12 text-base font-medium border-border/50 hover:bg-muted/30"
								render={<Link to="/blog" />}
							>
								View all
							</Button>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
