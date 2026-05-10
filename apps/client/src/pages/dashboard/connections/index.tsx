import {
	useAcceptedPeople,
	useAcceptRequest,
	useCancelRequest,
	useReceivableFrom,
	useReceivedRequests,
	useRejectRequest,
	useSendableTo,
	useSentEmailInvites,
	useSentRequests,
} from "@filosign/react/hooks";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import AddRecipientDialog from "@/src/lib/components/custom/AddRecipientDialog";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Loader } from "@/src/lib/components/ui/loader";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/src/lib/components/ui/tabs";
import { cn } from "@/src/lib/utils/index";
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

function TabCount({ count }: { count: number }) {
	if (count <= 0) return null;
	return <span className="tabular-nums text-muted-foreground">({count})</span>;
}

function EmptyHint({
	title,
	className,
}: {
	title: string;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"py-12 text-center text-sm text-muted-foreground",
				className,
			)}
		>
			{title}
		</p>
	);
}

export default function ConnectionsPage() {
	const queryClient = useQueryClient();
	const receivedRequests = useReceivedRequests();
	const sentRequests = useSentRequests();
	const emailInvites = useSentEmailInvites();
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

	const pendingWalletCount = pendingIncoming.length + pendingOutgoing.length;
	const pendingInviteCount =
		emailInvites.data?.filter((i) => !i.accepted).length ?? 0;

	const loadingContacts =
		acceptedPeople.isLoading ||
		sendableTo.isLoading ||
		receivableFrom.isLoading;

	const tableWrap = "overflow-x-auto";
	const th =
		"border-b border-border py-2 pr-4 text-left text-xs font-medium text-muted-foreground first:pl-0 last:pr-0";
	const td =
		"border-b border-border/80 py-3 pr-4 align-middle first:pl-0 last:pr-0";
	const row = "hover:bg-muted/30";

	return (
		<DashboardLayout>
			<div className="flex min-h-0 flex-1 flex-col bg-background">
				<div className="border-b border-border px-6 py-5 md:px-8">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 space-y-0.5">
							<h1 className="text-base font-semibold text-foreground">
								Contacts
							</h1>
							<p className="text-sm text-muted-foreground">
								Add by email, review requests, and invites.
							</p>
						</div>
						<AddRecipientDialog
							trigger={
								<Button variant="primary" size="sm" className="gap-1.5">
									<PlusIcon className="size-4" weight="bold" />
									Add contact
								</Button>
							}
							onRequestCompleted={() => invalidateSharingQueries(queryClient)}
						/>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col px-6 py-5 md:px-8">
					<Tabs
						defaultValue="contacts"
						className="flex min-h-0 flex-1 flex-col gap-0"
					>
						<TabsList className="mb-5 h-9 w-fit max-w-full">
							<TabsTrigger value="contacts">Contacts</TabsTrigger>
							<TabsTrigger value="requests">
								<span className="flex items-center gap-1.5">
									Pending requests
									<TabCount count={pendingWalletCount} />
								</span>
							</TabsTrigger>
							<TabsTrigger value="invites">
								<span className="flex items-center gap-1.5">
									Sent invites
									<TabCount count={pendingInviteCount} />
								</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="contacts" className="mt-0 flex-1 outline-none">
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-xs text-muted-foreground">
									{contacts.length}{" "}
									{contacts.length === 1 ? "contact" : "contacts"}
								</p>
								<div className="relative w-full max-w-xs">
									<MagnifyingGlassIcon
										className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
										weight="regular"
									/>
									<Input
										type="search"
										placeholder="Search…"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										className="h-8 border-border/80 bg-transparent pl-8 text-sm"
									/>
								</div>
							</div>

							<div className={tableWrap}>
								{loadingContacts ? (
									<div className="flex justify-center py-16">
										<Loader />
									</div>
								) : filteredContacts.length === 0 ? (
									<EmptyHint
										title={
											contacts.length === 0
												? "No contacts yet. Use Add contact to invite someone."
												: "No matches."
										}
									/>
								) : (
									<table className="w-full min-w-[520px] border-collapse text-sm">
										<thead>
											<tr>
												<th className={th}>Contact</th>
												<th className={cn(th, "hidden lg:table-cell")}>
													Wallet
												</th>
												<th className={th}>Sharing</th>
											</tr>
										</thead>
										<tbody>
											{filteredContacts.map((c) => (
												<tr key={c.wallet} className={row}>
													<td className={td}>
														<div className="flex items-center gap-2.5">
															<div className="flex size-8 shrink-0 overflow-hidden rounded-full bg-muted">
																{c.avatarUrl ? (
																	<Image
																		src={c.avatarUrl}
																		alt=""
																		className="size-8 object-cover"
																		width={32}
																		height={32}
																	/>
																) : (
																	<span className="flex size-8 items-center justify-center text-[11px] font-medium text-muted-foreground">
																		{initialsFromName(c.displayName, c.wallet)}
																	</span>
																)}
															</div>
															<div className="min-w-0">
																<div className="truncate font-medium">
																	{c.displayName || shortWallet(c.wallet)}
																</div>
																<div className="truncate font-mono text-xs text-muted-foreground lg:hidden">
																	{shortWallet(c.wallet)}
																</div>
															</div>
														</div>
													</td>
													<td className={cn(td, "hidden lg:table-cell")}>
														<div className="flex items-center gap-1">
															<span className="font-mono text-xs text-muted-foreground">
																{shortWallet(c.wallet)}
															</span>
															<WalletCopyButton address={c.wallet} />
														</div>
													</td>
													<td className={td}>
														<div className="flex flex-wrap gap-1">
															{c.canSendTo ? (
																<Badge
																	variant="secondary"
																	className="text-[10px] font-normal"
																>
																	You can send
																</Badge>
															) : null}
															{c.canReceiveFrom ? (
																<Badge
																	variant="secondary"
																	className="text-[10px] font-normal"
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
								)}
							</div>
						</TabsContent>

						<TabsContent value="requests" className="mt-0 flex-1 outline-none">
							<div className="space-y-10">
								<div>
									<h2 className="mb-3 text-xs font-medium text-muted-foreground">
										Incoming
									</h2>
									<div className={tableWrap}>
										{receivedRequests.isLoading ? (
											<div className="flex justify-center py-16">
												<Loader />
											</div>
										) : pendingIncoming.length === 0 ? (
											<EmptyHint title="None pending." />
										) : (
											<table className="w-full min-w-[520px] border-collapse text-sm">
												<thead>
													<tr>
														<th className={th}>From</th>
														<th className={cn(th, "hidden md:table-cell")}>
															Message
														</th>
														<th className={th}>Received</th>
														<th className={cn(th, "text-right")}> </th>
													</tr>
												</thead>
												<tbody>
													{pendingIncoming.map((req) => (
														<tr key={req.id} className={row}>
															<td className={td}>
																<div className="flex items-center gap-1.5">
																	<span className="font-mono text-sm">
																		{shortWallet(req.senderWallet)}
																	</span>
																	<WalletCopyButton
																		address={req.senderWallet}
																	/>
																</div>
																{req.message ? (
																	<p className="mt-1 text-xs text-muted-foreground md:hidden">
																		{req.message}
																	</p>
																) : null}
															</td>
															<td className={cn(td, "hidden md:table-cell")}>
																<p className="max-w-sm text-muted-foreground">
																	{req.message || "—"}
																</p>
															</td>
															<td
																className={cn(
																	td,
																	"whitespace-nowrap text-xs text-muted-foreground",
																)}
															>
																{new Date(req.createdAt).toLocaleDateString(
																	undefined,
																	{ dateStyle: "medium" },
																)}
															</td>
															<td className={cn(td, "text-right")}>
																<div className="flex justify-end gap-2">
																	<Button
																		type="button"
																		size="sm"
																		variant="outline"
																		className="h-8 text-muted-foreground"
																		disabled={rejectRequest.isPending}
																		onClick={() =>
																			rejectRequest.mutateAsync(req.id)
																		}
																	>
																		Decline
																	</Button>
																	<Button
																		type="button"
																		size="sm"
																		variant="primary"
																		className="h-8"
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
															</td>
														</tr>
													))}
												</tbody>
											</table>
										)}
									</div>
								</div>

								<div>
									<h2 className="mb-3 text-xs font-medium text-muted-foreground">
										Outgoing
									</h2>
									<div className={tableWrap}>
										{sentRequests.isLoading ? (
											<div className="flex justify-center py-16">
												<Loader />
											</div>
										) : pendingOutgoing.length === 0 ? (
											<EmptyHint title="None pending." />
										) : (
											<table className="w-full min-w-[480px] border-collapse text-sm">
												<thead>
													<tr>
														<th className={th}>To</th>
														<th className={cn(th, "hidden md:table-cell")}>
															Message
														</th>
														<th className={th}>Sent</th>
														<th className={cn(th, "text-right")}> </th>
													</tr>
												</thead>
												<tbody>
													{pendingOutgoing.map((req) => (
														<tr key={req.id} className={row}>
															<td className={td}>
																<div className="flex items-center gap-1.5">
																	<span className="font-mono text-sm">
																		{shortWallet(req.recipientWallet)}
																	</span>
																	<WalletCopyButton
																		address={req.recipientWallet}
																	/>
																</div>
																{req.message ? (
																	<p className="mt-1 text-xs text-muted-foreground md:hidden">
																		{req.message}
																	</p>
																) : null}
															</td>
															<td className={cn(td, "hidden md:table-cell")}>
																<p className="max-w-sm text-muted-foreground">
																	{req.message || "—"}
																</p>
															</td>
															<td
																className={cn(
																	td,
																	"whitespace-nowrap text-xs text-muted-foreground",
																)}
															>
																{new Date(req.createdAt).toLocaleDateString(
																	undefined,
																	{ dateStyle: "medium" },
																)}
															</td>
															<td className={cn(td, "text-right")}>
																<Button
																	type="button"
																	size="sm"
																	variant="ghost"
																	className="h-8 text-muted-foreground"
																	disabled={cancelRequest.isPending}
																	onClick={() =>
																		cancelRequest.mutateAsync(req.id)
																	}
																>
																	Cancel
																</Button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										)}
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="invites" className="mt-0 flex-1 outline-none">
							<div className={tableWrap}>
								{emailInvites.isLoading ? (
									<div className="flex justify-center py-16">
										<Loader />
									</div>
								) : !emailInvites.data?.length ? (
									<EmptyHint title="No email invites sent yet." />
								) : (
									<table className="w-full min-w-[480px] border-collapse text-sm">
										<thead>
											<tr>
												<th className={th}>Email</th>
												<th className={cn(th, "hidden md:table-cell")}>
													Message
												</th>
												<th className={th}>Sent</th>
												<th className={th}>Status</th>
											</tr>
										</thead>
										<tbody>
											{emailInvites.data.map((inv) => (
												<tr key={inv.id} className={row}>
													<td className={td}>
														<span className="font-medium">
															{inv.inviteeEmail}
														</span>
														{inv.message ? (
															<p className="mt-1 text-xs text-muted-foreground md:hidden">
																{inv.message}
															</p>
														) : null}
													</td>
													<td className={cn(td, "hidden md:table-cell")}>
														<p className="max-w-sm text-muted-foreground">
															{inv.message || "—"}
														</p>
													</td>
													<td
														className={cn(
															td,
															"whitespace-nowrap text-xs text-muted-foreground",
														)}
													>
														{new Date(inv.createdAt).toLocaleDateString(
															undefined,
															{
																dateStyle: "medium",
															},
														)}
													</td>
													<td className={td}>
														{inv.accepted ? (
															<Badge
																variant="secondary"
																className="font-normal"
															>
																Joined
															</Badge>
														) : (
															<Badge
																variant="secondary"
																className="font-normal"
															>
																Pending
															</Badge>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</DashboardLayout>
	);
}
