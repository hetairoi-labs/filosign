import { ArrowSquareOutIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";

export default function ChangelogHeroIsland() {
	return (
		<section className="pt-32 pb-20 px-4 md:px-8 lg:px-page bg-background relative overflow-hidden min-h-[20dvh] sm:min-h-[60dvh] border-b border-border/50 flex items-center justify-center">
			<div className="max-w-3xl mx-auto text-center relative z-10">
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground mb-4"
				>
					What's new?
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="text-lg text-muted-foreground max-w-xl mx-auto mb-10"
				>
					A changelog of new features, design improvements and enhancements
					lately
				</motion.p>

				<motion.a
					href="https://github.com/hetairoi-labs/filosign/blob/main/CHANGELOG.md"
					target="_blank"
					rel="noreferrer"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.3 }}
					className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-background hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground ring-1 ring-border/50 mb-6"
				>
					<GithubLogoIcon className="size-4" weight="fill" />
					<span className="text-sm font-medium font-manrope">
						Changelog on GitHub
					</span>
					<ArrowSquareOutIcon className="size-4" />
				</motion.a>
			</div>

			<div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
				<div className="absolute bottom-[50%] -left-[15%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] border-secondary rounded-full" />

				<div className="absolute top-[30%] -right-[20%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] rounded-full border-secondary" />
			</div>
		</section>
	);
}
