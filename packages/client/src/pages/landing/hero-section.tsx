import {
	CaretRightIcon,
	CircleIcon,
	GithubLogoIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useConnectButtonLogic } from "@/src/lib/components/custom/ConnectButton";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
// import TrustedCompanies from "./trusted-companies";

export default function HeroSection() {
	const { buttonState, isLoading, primaryCta, signIn } =
		useConnectButtonLogic();

	return (
		<section className="lg:max-w-[80dvw] mx-auto flex flex-col gap-6 md:gap-8 py-12 p-8 md:p-page">
			{/* Text Content Group */}
			<motion.div
				className="flex flex-col gap-4"
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					type: "spring",
					stiffness: 200,
					damping: 25,
					delay: 0.8,
				}}
			>
				{/* Announcement Banner */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 1.3,
					}}
					className="self-start group"
				>
					<Badge variant="primary">
						<CircleIcon
							className="size-4 animate-pulse text-secondary"
							weight="fill"
						/>{" "}
						Public Beta
					</Badge>
				</motion.div>

				{/* Main Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 1.4,
					}}
					className="text-3xl sm:text-4xl md:text-5xl xl:text-7xl leading-tight"
				>
					Trustless standard for permanent agreements.
				</motion.h1>

				{/* Sub-headline */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 1.5,
					}}
					className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed -mt-2 font-manrope font-light"
				>
					Send, sign, and verify sensitive documents with encrypted workflows.
				</motion.p>

				{/* Action Buttons */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 1.6,
					}}
					className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
				>
					{primaryCta ? (
						<Button
							variant="primary"
							size="lg"
							asChild
							className="w-full sm:w-auto"
						>
							<Link
								to={primaryCta.to}
								className="flex items-center justify-center gap-2 group"
							>
								Get Started
								<CaretRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
							</Link>
						</Button>
					) : (
						<Button
							variant="primary"
							size="lg"
							className="w-full sm:w-auto"
							disabled={buttonState === "loading" || isLoading}
							onClick={buttonState === "signin" ? signIn : undefined}
						>
							Get Started
							<CaretRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Button>
					)}

					<Button
						variant="ghost"
						size="lg"
						asChild
						className="w-full sm:w-auto"
					>
						<a
							href="https://github.com/hetairoi-labs/filosign"
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-center gap-2 group"
						>
							<GithubLogoIcon className="size-4" weight="fill" />
							Source code
						</a>
					</Button>
				</motion.div>
			</motion.div>

			{/* Hero Image */}
			<motion.div
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					type: "spring",
					stiffness: 200,
					damping: 50,
					delay: 1.5,
				}}
				className="relative flex items-center justify-center rounded-3xl mt-4 overflow-hidden group"
			>
				{/* Background Stock Image */}

				<div className="absolute inset-0" />

				<video
					autoPlay
					loop
					muted
					playsInline
					width={1200}
					height={600}
					className="w-full h-auto aspect-video rounded-large relative z-10 shadow-sm object-cover"
				>
					<source src="static/demo.webm" type="video/webm" />
				</video>
			</motion.div>

			{/* <TrustedCompanies /> */}
		</section>
	);
}
