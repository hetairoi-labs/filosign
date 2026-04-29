import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Image } from "@/src/lib/components/custom/Image";
import MarkdownRenderer from "@/src/lib/components/custom/MarkdownRenderer";
import FooterSection from "../landing/footer-section";
import LandingNavbar from "../landing/landing-nav";
import { blogPosts } from "./mock";

export default function BlogPostPage() {
	const { postId } = useParams({ from: "/blog/$postId" });
	const post = blogPosts[postId] ?? blogPosts["introducing-filosign"];

	return (
		<div className="min-h-screen bg-background font-manrope selection:bg-primary/10 selection:text-primary">
			<LandingNavbar />

			<main className="pt-32 pb-20">
				{/* Header & Hero Container - Wider width */}
				<div className="lg:max-w-[60dvw] mx-auto px-8 md:px-page mb-12">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24 mb-12 items-start"
					>
						{/* Left Column: Title & Meta */}
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

					{/* Hero Media */}
					<motion.div
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="rounded-[2rem] overflow-hidden shadow-sm"
					>
						{post.heroVideo ? (
							<video
								autoPlay
								loop
								muted
								playsInline
								className="w-full h-auto object-cover aspect-[16/9] lg:aspect-[2/1]"
							>
								<source src={post.heroVideo} type="video/webm" />
							</video>
						) : (
							<Image
								src={post.heroImage}
								alt={post.title}
								width={1280}
								height={720}
								className="w-full h-auto object-cover aspect-[16/9] lg:aspect-[2/1]"
							/>
						)}
					</motion.div>
				</div>

				{/* Article Content Container - Narrower width */}
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
			</main>

			<FooterSection />
		</div>
	);
}
