import { motion } from "motion/react";
import type { BlogPost } from "../../content/blog";
import MarkdownRenderer from "./MarkdownRenderer";

interface BlogPostIslandProps {
	post: BlogPost;
}

export default function BlogPostIsland({ post }: BlogPostIslandProps) {
	return (
		<div className="pt-32 pb-20">
			<div className="lg:max-w-[60dvw] mx-auto px-8 md:px-page mb-12">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24 mb-12 items-start"
				>
					<div className="lg:col-span-7 space-y-4">
						<div className="flex items-center">
							<span className="bg-secondary text-foreground px-3 py-1 rounded-full text-xs font-normal tracking-wide">
								Reading time: {post.readingTime}
							</span>
						</div>

						<h1 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground leading-[1.05] font-manrope">
							{post.title}
						</h1>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					{post.heroVideo ? (
						<video
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-auto rounded-xl object-cover aspect-[16/9] lg:aspect-[2/1]"
						>
							<source src={post.heroVideo} type="video/webm" />
						</video>
					) : (
						<img
							src={post.heroImage}
							alt={post.title}
							width={1280}
							height={720}
							className="w-full h-auto rounded-xl object-cover aspect-[16/9] lg:aspect-[2/1]"
						/>
					)}
				</motion.div>
			</div>

			<article className="max-w-5xl mx-auto px-8 md:px-page">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<MarkdownRenderer content={post.content} />
				</motion.div>
			</article>
		</div>
	);
}
