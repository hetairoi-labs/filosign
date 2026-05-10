import { useSetPrimaryEmail, useUserProfile } from "@filosign/react/hooks";
import {
	EnvelopeSimpleIcon,
	GoogleLogoIcon,
	PlusIcon,
	StarIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import type { User } from "@privy-io/react-auth";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";

type LinkedConnection =
	| {
			key: string;
			kind: "email";
			email: string;
	  }
	| {
			key: string;
			kind: "google";
			email: string;
			subject: string;
	  };

function connectionsFromPrivyUser(user: User | null): LinkedConnection[] {
	if (!user) return [];

	const out: LinkedConnection[] = [];
	const linked = user.linkedAccounts;

	if (linked?.length) {
		for (const a of linked) {
			if (a.type === "email" && "address" in a && a.address) {
				out.push({
					key: `email:${a.address.toLowerCase()}`,
					kind: "email",
					email: a.address.trim(),
				});
			}
			if (a.type === "google_oauth") {
				const email =
					"email" in a && typeof (a as { email?: string }).email === "string"
						? (a as { email: string }).email.trim()
						: "";
				const subject =
					"subject" in a &&
					typeof (a as { subject?: string }).subject === "string"
						? (a as { subject: string }).subject
						: "";
				if (email && subject) {
					out.push({
						key: `google:${subject}`,
						kind: "google",
						email,
						subject,
					});
				}
			}
		}
	}

	if (!out.length) {
		if (user.email?.address) {
			out.push({
				key: `email:${user.email.address.toLowerCase()}`,
				kind: "email",
				email: user.email.address.trim(),
			});
		}
		if (user.google?.email && user.google.subject) {
			out.push({
				key: `google:${user.google.subject}`,
				kind: "google",
				email: user.google.email.trim(),
				subject: user.google.subject,
			});
		}
	}

	return out;
}

function ProviderIcon({ kind }: { kind: LinkedConnection["kind"] }) {
	if (kind === "google") {
		return (
			<GoogleLogoIcon
				className="size-4 shrink-0 text-muted-foreground/70"
				weight="regular"
			/>
		);
	}
	return (
		<EnvelopeSimpleIcon
			className="size-4 shrink-0 text-muted-foreground/70"
			weight="regular"
		/>
	);
}

const iconButton =
	"size-8 text-muted-foreground hover:text-foreground hover:bg-muted/60";

export function LinkedAccountsSection() {
	const {
		user,
		linkEmail,
		linkGoogle,
		unlinkEmail: unlinkPrivyEmail,
		unlinkGoogle,
	} = usePrivy();
	const { identityToken } = useIdentityToken();
	const { data: profile } = useUserProfile();
	const setPrimary = useSetPrimaryEmail();

	const connections = connectionsFromPrivyUser(user ?? null);
	const primaryNormalized = profile?.email?.trim().toLowerCase() ?? "";

	const linkedAccountCount = user?.linkedAccounts?.length ?? 0;
	const canUnlinkAny = linkedAccountCount > 1;

	const handleMakePrimary = async (email: string) => {
		if (!identityToken) {
			toast.error("Session expired. Sign in again and retry.");
			return;
		}
		try {
			await setPrimary.mutateAsync({ identityToken, email });
			toast.success("Primary email updated.");
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Could not update primary email.";
			toast.error(message);
		}
	};

	const handleUnlink = async (row: LinkedConnection) => {
		if (!canUnlinkAny) {
			toast.error("Add another way to sign in before removing this one.");
			return;
		}
		try {
			if (row.kind === "email") {
				await unlinkPrivyEmail(row.email);
				toast.success("Email sign-in removed.");
			} else {
				await unlinkGoogle(row.subject);
				toast.success("Google account disconnected.");
			}
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Could not remove this account.";
			toast.error(message);
		}
	};

	return (
		<TooltipProvider delay={300}>
			<Card className="border-border/50 shadow-none">
				<CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
					<CardTitle className="text-sm font-medium text-foreground/85">
						Linked accounts
					</CardTitle>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-8 gap-1.5 px-2.5 text-sm font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
								/>
							}
						>
							<PlusIcon className="size-4 shrink-0" weight="bold" />
							<span>Link account</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-40">
							<DropdownMenuItem
								className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
								onClick={() => linkEmail()}
							>
								<EnvelopeSimpleIcon className="size-4 opacity-70" />
								Email
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
								onClick={() => linkGoogle()}
							>
								<GoogleLogoIcon className="size-4 opacity-70" />
								Google
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardHeader>
				<CardContent className="pt-0">
					{connections.length === 0 ? (
						<p className="text-sm text-muted-foreground/80">None linked yet.</p>
					) : (
						<ul className="divide-y divide-border/50">
							{connections.map((row) => {
								const isPrimary =
									row.email.toLowerCase() === primaryNormalized &&
									primaryNormalized.length > 0;
								return (
									<li
										key={row.key}
										className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
									>
										<ProviderIcon kind={row.kind} />
										<div className="min-w-0 flex-1 flex items-center gap-2">
											<span className="truncate text-sm text-foreground/85">
												{row.email}
											</span>
											{isPrimary ? (
												<StarIcon
													className="size-3.5 shrink-0 text-muted-foreground/60"
													weight="fill"
													aria-hidden
												/>
											) : null}
										</div>
										<div className="flex items-center gap-0.5 shrink-0">
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															className={iconButton}
															disabled={
																isPrimary ||
																setPrimary.isPending ||
																!identityToken ||
																!user
															}
															aria-label="Set as primary"
															onClick={() => handleMakePrimary(row.email)}
														/>
													}
												>
													<StarIcon className="size-4" weight="regular" />
												</TooltipTrigger>
												<TooltipContent side="top">
													Set as primary
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															className={iconButton}
															disabled={!canUnlinkAny}
															aria-label="Remove account"
															onClick={() => handleUnlink(row)}
														/>
													}
												>
													<TrashIcon className="size-4" weight="regular" />
												</TooltipTrigger>
												<TooltipContent side="top">
													{canUnlinkAny ? "Remove" : "Add another login first"}
												</TooltipContent>
											</Tooltip>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
