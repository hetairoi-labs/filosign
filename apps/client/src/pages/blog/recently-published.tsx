import { motion } from "motion/react";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";

type Category = "Articles" | "Filosign News" | "Customer Story";

type BlogPost = {
	id: string;
	title: string;
	category: Category;
	image: string;
	slug: string;
};

const posts: BlogPost[] = [
	{
		id: "recent-1",
		title:
			"The hidden costs of traditional signing: What every business needs to know",
		category: "Articles",
		image: "/images/stock_3.webp",
		slug: "/blog/post-6",
	},
	{
		id: "recent-2",
		title:
			"Filosign launches new ZK-powered verification engine for private agreements",
		category: "Filosign News",
		image: "/images/stock_6.webp",
		slug: "/blog/post-7",
	},
	{
		id: "recent-3",
		title: "How Quantum Leap DAO doubled their governance speed with Filosign",
		category: "Customer Story",
		image: "/images/stock_5.webp",
		slug: "/blog/post-8",
	},
];

export default function RecentlyPublished() {
	return (
		<section className="py-20 px-4 md:px-8 lg:px-page bg-background">
			<div className="max-w-7xl mx-auto">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-3xl md:text-4xl font-medium font-manrope tracking-tight mb-12"
				>
					Recently published
				</motion.h2>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{posts.map((post, index) => (
						<motion.div
							key={post.id}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group cursor-pointer flex flex-col gap-6"
						>
							{/* Image Container */}
							<div className="relative rounded-3xl overflow-hidden w-full aspect-[16/9]">
								<Image
									src={post.image}
									alt={post.title}
									width={600}
									height={400}
									className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
								/>
							</div>

							{/* Content */}
							<div className="flex flex-col gap-3">
								<Badge
									variant="secondary"
									className="bg-secondary/30 text-secondary-foreground hover:bg-secondary/40 w-fit px-3 py-1 font-normal"
								>
									{post.category}
								</Badge>
								<h3 className="text-xl md:text-2xl font-medium font-manrope leading-tight group-hover:text-muted-foreground transition-colors">
									{post.title}
								</h3>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
