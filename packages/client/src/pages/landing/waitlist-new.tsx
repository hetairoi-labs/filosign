import { CheckIcon, LightningIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";

export default function WaitlistNewSection() {
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isDuplicate, setIsDuplicate] = useState(false);

	const handleJoinWaitlist = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		try {
			// await joinWaitlist.mutateAsync(email);
			setIsSubmitted(true);
			setIsDuplicate(false);
			setEmail("");
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (
				errorMessage.includes("Email already registered") ||
				errorMessage.includes("already registered")
			) {
				setIsSubmitted(true);
				setIsDuplicate(true);
				setEmail("");
				return;
			}
			console.error("Error joining waitlist:", error);
		}
	};

	return (
		<section className="px-8 py-24 md:px-12">
			<div
				className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-cover bg-center bg-no-repeat p-8 text-center sm:p-16 md:p-24 relative"
				style={{ backgroundImage: "url('/static/images/stock_1.webp')" }}
			>
				{/* Background Overlay */}
				<div className="absolute inset-0 bg-foreground/80" />

				<div className="relative z-10 flex flex-col items-center gap-8">
					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium text-card-foreground border border-border"
					>
						<span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
							<LightningIcon weight="fill" className="h-3.5 w-3.5" />
						</span>
						<span>filosign is in closed beta.</span>
					</motion.div>

					{/* Heading */}
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.1 }}
						className="max-w-2xl text-4xl tracking-tight text-background sm:text-5xl md:text-7xl font-manrope"
					>
						Join the waitlist for early access.
					</motion.h2>

					{/* Form */}
					<div className="w-full max-w-lg mt-4">
						<AnimatePresence mode="wait">
							{!isSubmitted ? (
								<motion.form
									key="form"
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									viewport={{ once: true }}
									transition={{ delay: 0.2 }}
									onSubmit={handleJoinWaitlist}
									className="flex flex-col gap-3 sm:flex-row"
								>
									<input
										id="waitlist-email"
										name="email"
										type="email"
										autoComplete="email"
										placeholder="What's your email address?"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										className="flex-1 rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-all"
									/>
									<Button type="submit" variant="secondary" className="h-12">
										Subscribe
									</Button>
								</motion.form>
							) : (
								<motion.div
									key="success"
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									className="flex flex-col items-center justify-center gap-3 rounded-xl bg-card p-6 text-card-foreground border border-border"
								>
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-secondary">
										<CheckIcon weight="bold" className="h-6 w-6" />
									</div>
									<div className="text-center">
										<h3 className="text-lg font-medium text-card-foreground">
											{isDuplicate
												? "Already subscribed!"
												: "You're on the list!"}
										</h3>
										<p className="text-sm text-muted-foreground">
											Keep an eye on your inbox for updates.
										</p>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>
		</section>
	);
}
