import { useFilosignContext } from "@filosign/react";
import { useIsRegistered } from "@filosign/react/hooks";
import {
	CheckCircleIcon,
	EnvelopeIcon,
	FileTextIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { Loader } from "@/src/lib/components/ui/loader";

export default function InvitePage() {
	const { inviteId } = useParams({ from: "/invite/$inviteId" });
	const { ready, authenticated, login } = usePrivy();
	const { api } = useFilosignContext();
	const navigate = useNavigate();
	const isRegistered = useIsRegistered();

	const [inviteData, setInviteData] = useState<{
		inviteeEmail: string;
		senderName?: string;
		message?: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isClaiming, setIsClaiming] = useState(false);
	const [claimSuccess, setClaimSuccess] = useState(false);

	// Fetch invite details
	useEffect(() => {
		const fetchInvite = async () => {
			if (!api || !inviteId) return;

			try {
				const response = await api.rpc.base.get(`/sharing/invite/${inviteId}`);
				// Axios response - data is already parsed
				const data = response.data;

				if (data?.data) {
					setInviteData({
						inviteeEmail: data.data.inviteeEmail,
						senderName: data.data.senderName,
						message: data.data.message,
					});
				} else {
					throw new Error("Invalid response");
				}
			} catch (error) {
				console.error("Failed to fetch invite:", error);
				toast.error("Invalid or expired invite link");
			} finally {
				setIsLoading(false);
			}
		};

		fetchInvite();
	}, [api, inviteId]);

	// Redirect to onboarding if just logged in (not registered yet)
	useEffect(() => {
		if (ready && authenticated && isRegistered.data === false) {
			navigate({ to: "/onboarding" });
		}
	}, [ready, authenticated, isRegistered.data, navigate]);

	// Auto-claim if already logged in and registered
	useEffect(() => {
		const claimInvite = async () => {
			if (
				!ready ||
				!authenticated ||
				!isRegistered.data ||
				!api ||
				!inviteId ||
				claimSuccess
			) {
				return;
			}

			setIsClaiming(true);

			try {
				await api.rpc.base.post(`/sharing/invite/${inviteId}/claim`, {});
				setClaimSuccess(true);
				toast.success(
					"Invite accepted! You can now receive documents from this sender.",
				);

				// Redirect after a short delay
				setTimeout(() => {
					navigate({ to: "/dashboard/permissions" });
				}, 2000);
			} catch (error) {
				console.error("Failed to claim invite:", error);
				toast.error("Failed to accept invite. It may have expired.");
			} finally {
				setIsClaiming(false);
			}
		};

		claimInvite();
	}, [
		ready,
		authenticated,
		isRegistered.data,
		api,
		inviteId,
		navigate,
		claimSuccess,
	]);

	const handleSignUp = async () => {
		// Store invite ID in session storage so we can claim after onboarding
		if (inviteId) {
			sessionStorage.setItem("pendingInviteId", inviteId);
		}
		login();
	};

	if (isLoading || !ready) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<Loader />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<Logo
						className="mx-auto mb-6"
						textClassName="text-foreground font-semibold"
					/>

					{claimSuccess ? (
						<div className="space-y-4">
							<div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
								<CheckCircleIcon className="size-10 text-green-600" />
							</div>
							<h1 className="text-2xl font-semibold">Invite Accepted!</h1>
							<p className="text-muted-foreground">
								You can now receive documents from this sender. Redirecting to
								dashboard...
							</p>
						</div>
					) : isClaiming ? (
						<div className="space-y-4">
							<Loader />
							<p className="text-muted-foreground">Accepting invite...</p>
						</div>
					) : authenticated ? (
						<div className="space-y-4">
							<Loader />
							<p className="text-muted-foreground">
								Setting up your account...
							</p>
						</div>
					) : (
						<div className="space-y-6">
							<div className="bg-card border rounded-2xl p-6 space-y-4">
								<div className="flex items-center gap-3">
									<div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
										<UserCircleIcon className="size-6 text-primary" />
									</div>
									<div className="text-left">
										<p className="font-medium">
											{inviteData?.senderName || "Someone"}
										</p>
										<p className="text-sm text-muted-foreground">
											wants to send you documents
										</p>
									</div>
								</div>

								{inviteData?.message && (
									<div className="bg-muted p-3 rounded-lg">
										<p className="text-sm italic">
											&quot;{inviteData.message}&quot;
										</p>
									</div>
								)}

								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<EnvelopeIcon className="size-4" />
									<span>Sent to {inviteData?.inviteeEmail}</span>
								</div>
							</div>

							<div className="space-y-4">
								<h1 className="text-2xl font-semibold text-center">
									Join Filosign
								</h1>

								<p className="text-muted-foreground text-center">
									Sign up free to receive secure, verifiable documents. Your
									files are encrypted and permanently stored.
								</p>

								<div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
									<div className="flex items-center gap-3">
										<FileTextIcon className="size-5 text-primary" />
										<span className="text-sm">
											Private, encrypted documents
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="size-5 text-primary" />
										<span className="text-sm">Legally binding signatures</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="size-5 text-primary" />
										<span className="text-sm">
											Free to use - no hidden fees
										</span>
									</div>
								</div>

								<Button
									onClick={handleSignUp}
									variant="primary"
									className="w-full"
								>
									Accept Invitation
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
