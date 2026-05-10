import {
	useAcceptedPeople,
	useAcceptRequest,
	useCancelRequest,
	useReceivableFrom,
	useReceivedRequests,
	useRejectRequest,
	useSendableTo,
	useSentRequests,
} from "@filosign/react/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import AddRecipientDialog from "@/src/lib/components/custom/AddRecipientDialog";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Loader } from "@/src/lib/components/ui/loader";
import DashboardLayout from "../layout";
import {
	initialsFromName,
	shortWallet,
	WalletCopyButton,
} from "./_components/contact-utils";

type UnifiedContact = {
	wallet: string;
	displayName: string | null;
	avatarUrl: string | null;
	canSendTo: boolean;
	canReceiveFrom: boolean;
};

function buildContacts(
	accepted:
		| {
				people: Array<{
					walletAddress: string | null;
					displayName: string | null;
					avatarUrl: string | null;
				}>;
		  }
		| undefined,
	sendable: Array<{ recipientWallet: string; active: boolean }> | undefined,
	receivable: Array<{ senderWallet: string; active: boolean }> | undefined,
): UnifiedContact[] {
	const map = new Map<string, UnifiedContact>();

	for (const p of accepted?.people ?? []) {
		if (!p.walletAddress) continue;
		const k = p.walletAddress.toLowerCase();
		map.set(k, {
			wallet: p.walletAddress,
			displayName: p.displayName,
			avatarUrl: p.avatarUrl,
			canSendTo: false,
			canReceiveFrom: false,
		});
	}

	for (const a of sendable ?? []) {
		if (!a.active) continue;
		const k = a.recipientWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canSendTo = true;
		} else {
			map.set(k, {
				wallet: a.recipientWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: true,
				canReceiveFrom: false,
			});
		}
	}

	for (const a of receivable ?? []) {
		if (!a.active) continue;
		const k = a.senderWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canReceiveFrom = true;
		} else {
			map.set(k, {
				wallet: a.senderWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: false,
				canReceiveFrom: true,
			});
		}
	}

	return [...map.values()].sort((a, b) => {
		const an = (a.displayName || a.wallet).toLowerCase();
		const bn = (b.displayName || b.wallet).toLowerCase();
		return an.localeCompare(bn);
	});
}

function invalidateSharingQueries(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	queryClient.invalidateQueries({ queryKey: ["received-requests"] });
	queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
	queryClient.invalidateQueries({ queryKey: ["sent-email-invites"] });
	queryClient.invalidateQueries({ queryKey: ["accepted-people"] });
	queryClient.invalidateQueries({ queryKey: ["sendable-to"] });
	queryClient.invalidateQueries({ queryKey: ["receivable-from"] });
	queryClient.invalidateQueries({ queryKey: ["accepted-recipients"] });
}

export default function ConnectionsPage() {
	const queryClient = useQueryClient();
	const receivedRequests = useReceivedRequests();
	const sentRequests = useSentRequests();
	const acceptedPeople = useAcceptedPeople();
	const sendableTo = useSendableTo();
	const receivableFrom = useReceivableFrom();

	const acceptRequest = useAcceptRequest();
	const rejectRequest = useRejectRequest();
	const cancelRequest = useCancelRequest();

	const [search, setSearch] = useState("");

	const contacts = useMemo(
		() =>
			buildContacts(acceptedPeople.data, sendableTo.data, receivableFrom.data),
		[acceptedPeople.data, sendableTo.data, receivableFrom.data],
	);

	const filteredContacts = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter((c) => {
			const wallet = c.wallet.toLowerCase();
			const name = (c.displayName || "").toLowerCase();
			return wallet.includes(q) || name.includes(q);
		});
	}, [contacts, search]);

	const pendingIncoming =
		receivedRequests.data?.filter((r) => r.status === "PENDING") ?? [];
	const pendingOutgoing =
		sentRequests.data?.filter((r) => r.status === "PENDING") ?? [];

	const loadingMain =
		receivedRequests.isLoading ||
		sentRequests.isLoading ||
		acceptedPeople.isLoading ||
		sendableTo.isLoading ||
		receivableFrom.isLoading;

	return (
		<DashboardLayout>
			<div className="flex min-h-0 flex-1 flex-col bg-background">
				<div className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-start md:justify-between md:px-8">
					<div>
						<h1 className="text-lg font-medium tracking-tight text-foreground/90">
							Contacts
						</h1>
						<p className="mt-1 max-w-xl text-sm text-muted-foreground">
							Add people by email, respond to requests, and manage who you
							exchange documents with.
						</p>
					</div>
					<AddRecipientDialog
						trigger={
							<Button variant="primary" className="shrink-0 gap-2">
								<PlusIcon className="size-4" weight="bold" />
								Add contact
							</Button>
						}
						onRequestCompleted={() => invalidateSharingQueries(queryClient)}
					/>
				</div>

				<div className="flex flex-col gap-10 px-6 py-8 md:px-8">
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-foreground/90">
							Needs your response
						</h2>
						<p className="text-xs text-muted-foreground">
							Accept or decline wallet connection requests from others.
						</p>
						{receivedRequests.isLoading ? (
							<div className="flex justify-center py-12">
								<Loader />
							</div>
						) : pendingIncoming.length === 0 ? (
							<p className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
								No pending requests.
							</p>
						) : (
							<ul className="divide-y divide-border/50 rounded-lg border border-border/60">
								{pendingIncoming.map((req) => (
									<li
										key={req.id}
										className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0 space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-medium text-foreground/90">
													{shortWallet(req.senderWallet)}
												</span>
												<WalletCopyButton address={req.senderWallet} />
											</div>
											{req.message ? (
												<p className="text-xs text-muted-foreground">
													{req.message}
												</p>
											) : null}
											<p className="text-[10px] text-muted-foreground/80">
												Received{" "}
												{new Date(req.createdAt).toLocaleDateString(undefined, {
													dateStyle: "medium",
												})}
											</p>
										</div>
										<div className="flex shrink-0 gap-2">
											<Button
												type="button"
												size="sm"
												variant="outline"
												className="text-muted-foreground"
												disabled={rejectRequest.isPending}
												onClick={() => rejectRequest.mutateAsync(req.id)}
											>
												Decline
											</Button>
											<Button
												type="button"
												size="sm"
												variant="primary"
												disabled={acceptRequest.isPending}
												onClick={() =>
													acceptRequest.mutateAsync({
														requestId: req.id,
													})
												}
											>
												Accept
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="space-y-3">
						<h2 className="text-sm font-medium text-foreground/90">
							Waiting on them
						</h2>
						<p className="text-xs text-muted-foreground">
							Pending requests you sent can be cancelled anytime.
						</p>
						{sentRequests.isLoading ? (
							<div className="flex justify-center py-8">
								<Loader />
							</div>
						) : pendingOutgoing.length === 0 ? (
							<p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
								No outgoing requests.
							</p>
						) : (
							<ul className="divide-y divide-border/50 rounded-lg border border-border/60">
								{pendingOutgoing.map((req) => (
									<li
										key={req.id}
										className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-medium">
													{shortWallet(req.recipientWallet)}
												</span>
												<WalletCopyButton address={req.recipientWallet} />
											</div>
											{req.message ? (
												<p className="mt-1 text-xs text-muted-foreground">
													{req.message}
												</p>
											) : null}
											<p className="mt-1 text-[10px] text-muted-foreground/80">
												Sent{" "}
												{new Date(req.createdAt).toLocaleDateString(undefined, {
													dateStyle: "medium",
												})}
											</p>
										</div>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											className="shrink-0 text-muted-foreground"
											disabled={cancelRequest.isPending}
											onClick={() => cancelRequest.mutateAsync(req.id)}
										>
											Cancel
										</Button>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="space-y-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-sm font-medium text-foreground/90">
									Your contacts
								</h2>
								<p className="text-xs text-muted-foreground">
									{contacts.length} contact
									{contacts.length === 1 ? "" : "s"}
								</p>
							</div>
							<input
								type="search"
								placeholder="Search by name or wallet…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="h-9 w-full max-w-sm rounded-md border border-border/60 bg-muted/20 px-3 text-sm text-foreground placeholder:text-muted-foreground/60"
							/>
						</div>

						{loadingMain ? (
							<div className="flex justify-center py-20">
								<Loader />
							</div>
						) : filteredContacts.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border/60 px-6 py-14 text-center">
								<p className="text-sm font-medium text-foreground/85">
									No contacts yet
								</p>
								<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
									Use Add contact to invite someone by email or send a
									connection request to an existing user.
								</p>
							</div>
						) : (
							<div className="overflow-hidden rounded-lg border border-border/60">
								<table className="w-full text-left text-sm">
									<thead>
										<tr className="border-b border-border/60 bg-muted/15">
											<th className="px-4 py-3 font-medium text-muted-foreground">
												Contact
											</th>
											<th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
												Wallet
											</th>
											<th className="px-4 py-3 font-medium text-muted-foreground">
												Permissions
											</th>
										</tr>
									</thead>
									<tbody>
										{filteredContacts.map((c) => (
											<tr
												key={c.wallet}
												className="border-b border-border/40 last:border-0"
											>
												<td className="px-4 py-3">
													<div className="flex items-center gap-3">
														<div className="flex size-9 shrink-0 overflow-hidden rounded-full bg-muted/40">
															{c.avatarUrl ? (
																<Image
																	src={c.avatarUrl}
																	alt=""
																	className="size-9 object-cover"
																	width={36}
																	height={36}
																/>
															) : (
																<span className="flex size-9 items-center justify-center text-xs font-medium text-muted-foreground">
																	{initialsFromName(c.displayName, c.wallet)}
																</span>
															)}
														</div>
														<div className="min-w-0">
															<div className="truncate font-medium text-foreground/90">
																{c.displayName || shortWallet(c.wallet)}
															</div>
															<div className="truncate font-mono text-xs text-muted-foreground md:hidden">
																{shortWallet(c.wallet)}
															</div>
														</div>
													</div>
												</td>
												<td className="hidden px-4 py-3 md:table-cell">
													<div className="flex items-center gap-1">
														<span className="font-mono text-xs text-muted-foreground">
															{shortWallet(c.wallet)}
														</span>
														<WalletCopyButton address={c.wallet} />
													</div>
												</td>
												<td className="px-4 py-3">
													<div className="flex flex-wrap gap-1.5">
														{c.canSendTo ? (
															<Badge
																variant="secondary"
																className="font-normal text-[10px]"
															>
																You can send
															</Badge>
														) : null}
														{c.canReceiveFrom ? (
															<Badge
																variant="secondary"
																className="font-normal text-[10px]"
															>
																Can send to you
															</Badge>
														) : null}
														{!c.canSendTo && !c.canReceiveFrom ? (
															<span className="text-xs text-muted-foreground">
																Connected
															</span>
														) : null}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</div>
		</DashboardLayout>
	);
}
