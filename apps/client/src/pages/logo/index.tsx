import { LightningIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface LogoProps {
	className?: string;
	iconClassName?: string;
	textClassName?: string;
	animatedLogo?: boolean;
	iconOnly?: boolean;
	isCollapsed?: boolean;
	showText?: boolean;
	textDelay?: number;
	iconDelay?: number;
}

export default function LogoPage({
	className,
	iconClassName,
	textClassName,
	animatedLogo = true,
	iconOnly = false,
	isCollapsed = false,
	showText = true,
	textDelay = 2.1,
	iconDelay = 2.26,
}: LogoProps) {
	const iconVariants = {
		hidden: {
			scale: 0,
			rotate: -180,
			transition: {
				type: "spring" as const,
				stiffness: 345,
				damping: 20,
				delay: iconDelay,
			},
		},
		visible: {
			scale: 1,
			rotate: 0,
			transition: {
				type: "spring" as const,
				stiffness: 345,
				damping: 20,
			},
		},
	};

	const textVariants = {
		hidden: {
			opacity: 0,
			x: -20,
			transition: {
				type: "spring" as const,
				stiffness: 230,
				damping: 25,
				delay: textDelay,
			},
		},
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				type: "spring" as const,
				stiffness: 230,
				damping: 25,
			},
		},
	};

	return (
		<div className="flex justify-center items-center min-h-screen">
			<motion.button
				key="logo"
				className={cn(
					"flex items-center group/logo py-2 cursor-pointer transition-all",
					!isCollapsed && "px-4 -ml-1",
					className,
				)}
				initial="hidden"
				animate="visible"
			>
				<motion.div
					className={cn(
						"p-2 rounded-4xl bg-secondary transition-colors duration-200 ml-1",
					)}
					variants={animatedLogo ? iconVariants : undefined}
					initial={animatedLogo ? "hidden" : undefined}
					animate={animatedLogo ? "visible" : undefined}
				>
					<LightningIcon
						className={cn(
							`size-64 text-foreground transition-all duration-200`,
							animatedLogo
								? `group-hover/logo:rotate-12 group-hover/logo:scale-105`
								: "",
							iconClassName,
						)}
						weight="fill"
					/>
				</motion.div>
				{!iconOnly && !isCollapsed && showText && (
					<motion.h3
						className={cn(
							"text-foreground ml-12 font-manrope text-[200px] transition-colors duration-200",
							textClassName,
						)}
						variants={textVariants}
						initial="hidden"
						animate="visible"
					>
						filosign
					</motion.h3>
				)}
			</motion.button>
		</div>
	);
}
