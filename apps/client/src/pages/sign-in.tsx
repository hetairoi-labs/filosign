import { useIsRegistered } from "@filosign/react/hooks";
import { SpinnerBallIcon } from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useWalletClient } from "wagmi";
import env from "@/src/env";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	hasColdReturn,
	toSignDocumentSearch,
} from "@/src/lib/routing/cold-invite-search";
import { OnboardingSwitchAccountLink } from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";

export default function SignInPage() {
	const { ready, authenticated, login } = usePrivy();
	const { data: walletClient } = useWalletClient();
	const isRegistered = useIsRegistered();
	const navigate = useNavigate();
	const coldSearch = useSearch({ from: "/" });
	const coldReturn = useMemo(
		() => hasColdReturn(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite],
	);
	const signSearch = useMemo(
		() => toSignDocumentSearch(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite],
	);

	useEffect(() => {
		if (!ready || !authenticated) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data !== true) return;
		if (signSearch) {
			void navigate({
				to: "/dashboard/document/sign",
				search: signSearch,
				replace: true,
			});
			return;
		}
		void navigate({ to: "/dashboard", replace: true });
	}, [
		ready,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		navigate,
		signSearch,
	]);

	const walletReady = Boolean(walletClient?.account.address);
	const needsAccountSetup =
		authenticated &&
		walletReady &&
		isRegistered.data === false &&
		!isRegistered.isPending;

	const signingIn = authenticated && (!walletReady || isRegistered.isPending);
	const buttonLoading = !ready;

	return (
		<main className="min-h-dvh grid lg:grid-cols-2 bg-background">
			<div className="relative hidden overflow-hidden lg:block">
				<img
					src="/images/stock_1.webp"
					alt=""
					className="absolute inset-0 size-full object-cover"
					width={1920}
					height={1080}
				/>
				<div className="relative z-10 flex h-full flex-col justify-between p-10">
					<Logo
						redirectTo="/"
						className="px-0"
						textClassName="text-foreground"
						textDelay={0}
						iconDelay={0}
					/>
					<blockquote className="max-w-md space-y-3 text-pretty">
						<p className="font-manrope text-xl font-medium leading-snug text-foreground md:text-2xl">
							Sign documents you can trust—with cryptography built for how teams
							work today.
						</p>
						<footer className="text-sm text-muted-foreground">
							Secure envelopes, verifiable signatures, one place to manage it
							all.
						</footer>
					</blockquote>
				</div>
			</div>

			<div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
				<div className="mx-auto w-full max-w-md space-y-10">
					<Logo
						redirectTo="/"
						className="px-0"
						textClassName="text-foreground"
						textDelay={0}
						iconDelay={0}
					/>

					{signingIn ? (
						<div className="flex flex-col items-center gap-4 py-8 text-center">
							<SpinnerBallIcon
								className="size-10 animate-spin text-muted-foreground"
								aria-hidden
							/>
							<div className="space-y-1">
								<p className="font-medium text-foreground">Signing you in…</p>
								<p className="text-sm text-muted-foreground">
									Preparing your workspace
								</p>
							</div>
						</div>
					) : needsAccountSetup ? (
						<div className="">
							<div className="space-y-2">
								<h1 className="font-manrope text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
									Finish setting up
								</h1>
								<p className="text-muted-foreground">
									You&apos;re signed in. Continue to create your Filosign
									account.
								</p>
							</div>
							<div className="rounded-2xl border bg-card p-6 shadow-xs mt-8">
								<Button
									type="button"
									variant="default"
									size="lg"
									className="w-full"
									onClick={() =>
										void navigate({
											to: "/onboarding",
											...(coldReturn
												? {
														search: {
															coldPieceCid: coldSearch.coldPieceCid,
															coldInvite: coldSearch.coldInvite,
														},
													}
												: {}),
										})
									}
								>
									Continue account setup
								</Button>
							</div>
							<OnboardingSwitchAccountLink />
						</div>
					) : (
						<div className="space-y-8">
							<div className="space-y-2">
								<h1 className="font-manrope text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
									Welcome back
								</h1>
								<p className="text-muted-foreground">
									Sign in with your preferred wallet or email to continue.
								</p>
							</div>

							<div className="rounded-2xl border bg-card p-6 shadow-xs">
								<Button
									type="button"
									variant="default"
									size="lg"
									className="w-full"
									disabled={buttonLoading}
									isLoading={buttonLoading}
									onClick={() => login()}
								>
									Continue with Privy
								</Button>
								<p className="mt-4 text-center text-xs text-muted-foreground">
									By continuing you agree to Filosign&apos;s terms and privacy
									practices.
								</p>
							</div>

							<p className="text-center text-sm text-muted-foreground">
								New to Filosign?{" "}
								<a
									href={env.VITE_MARKETING_SITE_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Learn more on our site
								</a>
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
