import { motion } from "motion/react";

export default function ChangelogHero() {
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

				{/* <motion.form
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					onSubmit={handleSubmit}
					className="flex flex-col items-center gap-4 max-w-sm mx-auto"
				>
					<Input
						type="email"
						placeholder="Enter your email address"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full bg-background border-border/50 h-12 text-base placeholder:text-muted-foreground/70"
						required
					/>
					<Button
						type="submit"
						variant="primary"
						size="lg"
						className="w-full h-12"
					>
						Subscribe to updates
					</Button>
				</motion.form> */}
			</div>

			{/* Background Arcs */}
			<div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
				<div className="absolute bottom-[50%] -left-[15%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] border-secondary rounded-full" />

				<div className="absolute top-[30%] -right-[20%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] rounded-full border-secondary" />
			</div>
		</section>
	);
}
