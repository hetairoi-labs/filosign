import {
	GithubLogoIcon,
	SparkleIcon,
	TwitterLogoIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";

const footerSections = [
	{
		title: "Product",
		links: [
			{ label: "Why Filosign", href: "/about" },
			{ label: "What's new", href: "/changelog" },
			{ label: "Pricing", href: "/pricing" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About us", href: "https://hetairoi.xyz" },
			{ label: "Contact", href: "#" },
			{ label: "Newsroom", href: "#" },
			{ label: "Privacy", href: "#" },
		],
	},
	{
		title: "Resources",
		links: [
			{ label: "Blog", href: "#" },
			{ label: "Customer center", href: "#" },
			{ label: "API", href: "#" },
		],
	},
];

export default function FooterSection() {
	return (
		<footer className="bg-card rounded-t-[3rem] py-24 min-h-[80dvh] flex flex-col justify-between">
			<div className="max-w-7xl mx-auto px-8 md:px-page w-full flex-1 flex flex-col justify-between">
				<div>
					<div className="flex flex-col lg:flex-row justify-between mb-4">
						<div className="max-w-xl">
							<motion.h2
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 font-manrope"
							>
								Get started with filosign
							</motion.h2>
						</div>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.1 }}
						>
							<Button
								variant={"primary"}
								className="group bg-primary text-primary-foreground h-12 rounded-xl"
							>
								<SparkleIcon className="size-4" weight="fill" />
								Try Filosign today
							</Button>
						</motion.div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-4 border-t border-border/50 pt-16">
						{footerSections.map((section) => (
							<div key={section.title} className="flex flex-col gap-6">
								<h4 className="text-sm font-medium text-muted-foreground font-manrope">
									{section.title}
								</h4>
								<ul className="flex flex-col gap-4">
									{section.links.map((link) => (
										<li key={link.label}>
											<a
												href={link.href}
												className="text-sm font-medium hover:text-primary transition-colors font-manrope flex items-center gap-2 group"
											>
												{link.label}
											</a>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 border-t border-border/50 pt-4">
					<div className="space-y-2">
						<Logo
							className="px-0"
							textClassName="text-4xl text-foreground"
							redirectTo="/"
						/>
						<p className="text-xs text-muted-foreground font-manrope">
							© 2025 Filosign. All rights reserved.
						</p>
					</div>

					<div className="flex items-center gap-4">
						<a
							href="https://x.com/filosign"
							target="_blank"
							rel="noreferrer"
							className="p-2 rounded-full bg-background hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
						>
							<TwitterLogoIcon className="size-6" weight="fill" />
						</a>
						<a
							href="https://github.com/hetairoi-labs/filosign"
							target="_blank"
							rel="noreferrer"
							className="p-2 rounded-full bg-background hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
						>
							<GithubLogoIcon className="size-6" weight="fill" />
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
