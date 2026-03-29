import {
	CheckIcon,
	PaperPlaneTiltIcon,
	RocketLaunchIcon,
	SpinnerBallIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { useApi } from "@/src/lib/hooks/use-api";

export default function WaitlistSection() {
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isDuplicate, setIsDuplicate] = useState(false);

	// Refs for scroll-triggered animations
	const waitlistRef = useRef(null);
	const waitlistInView = useInView(waitlistRef, {
		once: true,
		margin: "-100px",
	});

	const { joinWaitlist } = useApi();

	const handleJoinWaitlist = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		try {
			await joinWaitlist.mutateAsync(email);
			setIsSubmitted(true);
			setIsDuplicate(false); // New registration
			setEmail(""); // Clear the email field on success
		} catch (error: any) {
			// Check if the error is specifically about duplicate email (409 status)
			if (
				error?.message?.includes("Email already registered") ||
				error?.message?.includes("already registered")
			) {
				// Treat duplicate email as success - user is already registered
				setIsSubmitted(true);
				setIsDuplicate(true); // Mark as duplicate
				setEmail(""); // Clear the email field
				return;
			}
			// For other errors, let the mutation's onError callback handle it
			console.error("Error joining waitlist:", error);
		}
	};

	return (
		<section
			ref={waitlistRef}
			className="lg:max-w-[80dvw] mx-auto min-h-screen flex items-center justify-center p-8 md:p-page"
		>
			<AnimatePresence mode="wait">
				{!isSubmitted ? (
					<motion.div
						key="waitlist-form"
						initial={{ opacity: 0, y: 50 }}
						animate={
							waitlistInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }
						}
						exit={{ opacity: 0, y: -20 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.2,
						}}
						className="flex flex-col gap-8 w-full"
					>
						{/* Funky Rocket Icon */}
						<motion.div
							initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
							animate={
								waitlistInView
									? { opacity: 1, scale: 1, rotate: 0 }
									: { opacity: 0, scale: 0.5, rotate: -180 }
							}
							transition={{
								type: "spring",
								stiffness: 300,
								damping: 20,
								delay: 0.2,
							}}
							className="flex justify-center"
						>
							<div className="relative">
								{/* Main rocket container */}
								<motion.div
									animate={{
										y: [0, -10, 0],
										rotate: [0, 2, -2, 0],
									}}
									transition={{
										duration: 2.5,
										repeat: Infinity,
										ease: "easeInOut",
									}}
									className="flex overflow-hidden relative justify-center items-center w-32 h-32 rounded-full border sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 bg-card"
								>
									{/* Rocket icon */}
									<RocketLaunchIcon
										className="w-16 h-16 drop-shadow-lg sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 text-primary"
										weight="fill"
									/>

									{/* Sparkle effects */}
									<motion.div
										animate={{
											rotate: 360,
											scale: [1, 1.2, 1],
										}}
										transition={{
											rotate: { duration: 8, repeat: Infinity, ease: "linear" },
											scale: {
												duration: 2,
												repeat: Infinity,
												ease: "easeInOut",
											},
										}}
										className="flex absolute inset-0 justify-center items-center"
									>
										<div className="absolute top-4 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
										<div
											className="absolute right-6 top-8 w-1 h-1 bg-blue-400 rounded-full animate-pulse"
											style={{ animationDelay: "0.5s" }}
										/>
										<div
											className="w-1.5 h-1.5 bg-pink-400 rounded-full absolute bottom-6 left-6 animate-pulse"
											style={{ animationDelay: "1s" }}
										/>
										<div
											className="absolute right-8 bottom-8 w-1 h-1 bg-green-400 rounded-full animate-pulse"
											style={{ animationDelay: "1.5s" }}
										/>
									</motion.div>
								</motion.div>

								{/* Orbiting particles */}
								<motion.div
									animate={{ rotate: 360 }}
									transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
									className="absolute inset-0"
								>
									<div className="absolute top-0 left-1/2 w-1 h-1 rounded-full transform -translate-x-1/2 -translate-y-2 bg-primary/60" />
									<div className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full transform -translate-x-1/2 translate-y-2 bg-primary/60" />
									<div className="absolute left-0 top-1/2 w-1 h-1 rounded-full transform -translate-x-2 -translate-y-1/2 bg-primary/60" />
									<div className="absolute right-0 top-1/2 w-1 h-1 rounded-full transform translate-x-2 -translate-y-1/2 bg-primary/60" />
								</motion.div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={
								waitlistInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
							}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.3,
							}}
							className="text-center"
						>
							<h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
								Join the waitlist
							</h1>
						</motion.div>

						<motion.form
							onSubmit={handleJoinWaitlist}
							className="mx-auto w-full max-w-7xl"
							initial={{ opacity: 0, y: 40 }}
							animate={
								waitlistInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
							}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.4,
							}}
						>
							<div className="flex flex-col gap-3 w-full sm:gap-4 md:flex-row">
								<input
									id="waitlist-email-main"
									name="email"
									type="email"
									autoComplete="email"
									placeholder="enter your email address"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="flex-1 p-3 text-base backdrop-blur-sm sm:text-lg md:text-2xl lg:text-4xl sm:p-4 md:p-5 rounded-main focus-visible:border-primary focus-visible:ring-primary/20 bg-card"
									required
								/>

								<motion.div
									whileTap={{ scale: 0.95 }}
									className="w-full md:w-auto"
								>
									<Button
										type="submit"
										variant="primary"
										disabled={!email || joinWaitlist.isPending}
										className="h-12 md:h-20 text-base sm:text-lg md:text-xl lg:text-2xl font-semibold group relative w-full px-12"
									>
										<AnimatePresence mode="wait">
											{joinWaitlist.isPending ? (
												<motion.div
													key="spinner"
													initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
													animate={{ opacity: 1, scale: 1, rotate: 0 }}
													exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
													transition={{
														duration: 0.3,
														ease: "easeInOut",
													}}
													className="flex justify-center items-center"
												>
													<SpinnerBallIcon className="animate-spin size-5 sm:size-6 md:size-8 lg:size-10" />
												</motion.div>
											) : (
												<motion.div
													key="send-icon"
													initial={{ opacity: 0, scale: 0.8, rotate: 180 }}
													animate={{ opacity: 1, scale: 1, rotate: 0 }}
													exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
													transition={{
														duration: 0.3,
														ease: "easeInOut",
													}}
													className="flex justify-center items-center"
												>
													<PaperPlaneTiltIcon className="transition-transform duration-200 size-5 sm:size-6 md:size-8 lg:size-10 group-hover:translate-x-1 group-hover:-translate-y-1 group-active:translate-x-0 group-active:translate-y-0" />
												</motion.div>
											)}
										</AnimatePresence>
									</Button>
								</motion.div>
							</div>
						</motion.form>
					</motion.div>
				) : (
					<motion.div
						key="success-message"
						initial={{
							y: 100,
							opacity: 0,
						}}
						animate={
							waitlistInView
								? {
										y: 0,
										opacity: 1,
									}
								: {
										y: 100,
										opacity: 0,
									}
						}
						exit={{
							y: -100,
							opacity: 0,
						}}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							duration: 0.8,
						}}
						className="p-8 space-y-6 text-center rounded-large"
					>
						<motion.div
							initial={{ y: 50, opacity: 0 }}
							animate={
								waitlistInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }
							}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.4,
							}}
							className="flex justify-center items-center mx-auto rounded-full border size-20 sm:size-24 md:size-28 lg:size-32 bg-primary"
						>
							<CheckIcon
								className="size-12 sm:size-16 md:size-18 lg:size-20 text-primary-foreground"
								weight="bold"
							/>
						</motion.div>

						<motion.div
							initial={{ y: 30, opacity: 0 }}
							animate={
								waitlistInView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }
							}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.5,
							}}
							className="space-y-2"
						>
							<motion.h1
								initial={{ y: 30, opacity: 0 }}
								animate={
									waitlistInView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }
								}
								transition={{
									type: "spring",
									stiffness: 200,
									damping: 25,
									delay: 0.5,
								}}
								className="text-2xl leading-tight sm:text-3xl md:text-4xl xl:text-7xl"
							>
								{isDuplicate
									? "You're already on the list!"
									: "You're on the list!"}
							</motion.h1>
							<motion.p
								initial={{ y: 30, opacity: 0 }}
								animate={
									waitlistInView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }
								}
								transition={{
									type: "spring",
									stiffness: 200,
									damping: 25,
									delay: 0.6,
								}}
								className="text-base leading-relaxed sm:text-lg xl:text-lg text-muted-foreground"
							>
								We'll notify you as soon as we go online.
							</motion.p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
