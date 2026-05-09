import { motion, useInView } from "motion/react";
import { useRef } from "react";
import Logo from "@/src/lib/components/custom/Logo";

export function IntroSlide() {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.5 });

	return (
		<div
			ref={ref}
			className="h-screen w-full snap-center flex flex-col items-center justify-center p-page text-center bg-grid-small-black/[0.2] relative"
		>
			<div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

			<motion.div
				initial={{ opacity: 0, x: -10 }}
				animate={inView ? { opacity: 1, x: 0 } : {}}
				transition={{ duration: 0.3, delay: 0.1 }}
			>
				<div className="flex justify-center">
					<Logo
						iconClassName="size-24 md:size-32 !text-primary-dark"
						textClassName="text-8xl md:text-9xl font-bold bg-clip-text !text-foreground bg-gradient-to-b from-primary-dark to-primary-medium !ml-6"
					/>
				</div>
				<p className="text-lg md:text-2xl text-muted-foreground mt-4 max-w-4xl">
					Trustless, on-chain immutable e-signatures.
				</p>
			</motion.div>

			<motion.div
				className="absolute bottom-10"
				initial={{ opacity: 0 }}
				animate={inView ? { opacity: 1 } : {}}
				transition={{ duration: 0.8, delay: 0.8 }}
			>
				<div className="size-8 text-muted-foreground animate-bounce">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<title>Decorative star</title>
						<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
					</svg>
				</div>
			</motion.div>
		</div>
	);
}
