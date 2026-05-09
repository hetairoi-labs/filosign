import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import MarketingLogo from "./MarketingLogo";

const navLinks = [
	{ label: "About", href: "/about" },
	{ label: "Blog", href: "/blog/introduction" },
	{ label: "Changelog", href: "/changelog" },
];

const secondaryButtonClass =
	"group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 gap-1.5 px-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 min-w-28 font-semibold";

interface LandingNavbarProps {
	appUrl: string;
}

export default function LandingNavbar({ appUrl }: LandingNavbarProps) {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;

			if (currentScrollY < 10) {
				setIsVisible(true);
			} else {
				setIsVisible(currentScrollY < lastScrollY);
			}

			setLastScrollY(currentScrollY);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => window.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);

	return (
		<section className="sticky top-10 z-50 p-page">
			<motion.nav
				className="flex justify-between items-center mx-auto max-w-3xl p-rect rounded-large glass text-background bg-foreground/90"
				initial={{ opacity: 0, y: -50 }}
				animate={{
					opacity: 1,
					y: isVisible ? 0 : -200,
				}}
				transition={{
					type: "spring",
					stiffness: 230,
					damping: 25,
					mass: 1.0,
					delay: 0,
				}}
			>
				<div className="flex items-center gap-4">
					<MarketingLogo
						textDelay={0.35}
						iconDelay={0.26}
						className="px-0 hidden md:block"
						redirectTo="/"
						iconOnly
					/>
					<MarketingLogo
						textDelay={0.35}
						iconDelay={0.26}
						className="px-0"
						redirectTo="/"
						textOnly
					/>
				</div>

				<motion.div
					className="hidden items-center space-x-4 md:flex"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 25,
						delay: 0.43,
					}}
				>
					{navLinks.map((link, index) => (
						<motion.a
							key={link.label}
							href={link.href}
							className="font-medium transition-colors duration-200 hover:bg-foreground/50 rounded-md px-2 py-2"
							initial={{ opacity: 0, y: -15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 230,
								damping: 25,
								delay: 0.52 + index * 0.087,
							}}
						>
							{link.label}
						</motion.a>
					))}
				</motion.div>

				<motion.div
					className="flex items-center gap-2"
					initial={{ opacity: 0, x: 30 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 30,
						mass: 1.2,
						delay: 0.78,
					}}
				>
					<a
						href={appUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(secondaryButtonClass)}
					>
						Get Started
					</a>
				</motion.div>
			</motion.nav>
		</section>
	);
}
