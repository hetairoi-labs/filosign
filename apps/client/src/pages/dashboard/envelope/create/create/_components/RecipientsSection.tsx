import { useAcceptedPeople } from "@filosign/react/hooks";
import {
	CaretDownIcon,
	CheckIcon,
	CoinsIcon,
	TrashIcon,
	UserIcon,
	UsersIcon,
	XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type Address,
	erc20Abi,
	formatUnits,
	getAddress,
	isAddress,
} from "viem";
import { useAccount, useReadContract } from "wagmi";
import { erc20DisplayForChain, SUPPORTED_TOKENS } from "@/src/constants";
import AddRecipientDialog from "@/src/lib/components/custom/AddRecipientDialog";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/src/lib/components/ui/avatar";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/src/lib/components/ui/command";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/src/lib/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { cn } from "@/src/lib/utils/utils";
import {
	initialsFromName,
	shortWallet,
} from "@/src/pages/dashboard/connections/_components/contact-utils";
import type { Recipient } from "../../types";
import { useRecipients } from "./envelope-draft-context";

/** Align with AddRecipientDialog (`labelClass` / `fieldClass`) */
const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground";
const FIELD_CONTROL_CLASS =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 shadow-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const CONNECTION_SEARCH_INPUT_GROUP_CLASS =
	"h-9! rounded-md! border-border/60! bg-muted/5! shadow-none!";

export default function RecipientsSection() {
	const {
		value: recipients,
		onChange,
		onBlur,
		error,
		isTouched,
	} = useRecipients();
	const [isRecipientsOpen, setIsRecipientsOpen] = useState(true);
	const [selectPopoverOpen, setSelectPopoverOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const acceptedPeople = useAcceptedPeople();

	const filteredConnections = useMemo(() => {
		if (!acceptedPeople.data?.people) return [];
		const query = searchQuery.toLowerCase();
		return acceptedPeople.data.people.filter((person) => {
			const wallet = (person.walletAddress || "").toLowerCase();
			const displayName = (person.displayName || "").toLowerCase();
			const username = (person.username || "").toLowerCase();
			const email = (person.email || "").toLowerCase();
			return (
				displayName.includes(query) ||
				wallet.includes(query) ||
				username.includes(query) ||
				email.includes(query)
			);
		});
	}, [acceptedPeople.data, searchQuery]);

	const existingAddresses = useMemo(
		() =>
			new Set((recipients || []).map((r) => r.walletAddress?.toLowerCase())),
		[recipients],
	);

	const handleSelectConnection = (person: {
		walletAddress: string;
		displayName: string | null;
		avatarUrl: string | null;
		email: string | null;
	}) => {
		const normalized = getAddress(person.walletAddress);
		if (existingAddresses.has(normalized.toLowerCase())) {
			toast.error("Recipient already added");
			return;
		}

		const newRecipient: Recipient = {
			name: person.displayName || "",
			email: person.email ?? "",
			walletAddress: normalized,
			role: "signer",
		};

		onChange([...(recipients || []), newRecipient]);
		setSelectPopoverOpen(false);
		setSearchQuery("");
		toast.success("Recipient added");
	};

	const removeRecipient = (index: number) => {
		const updated = [...(recipients || [])];
		updated.splice(index, 1);
		onChange(updated);
	};

	const updateRecipient = (index: number, updates: Partial<Recipient>) => {
		const updated = [...(recipients || [])];
		updated[index] = { ...updated[index], ...updates };
		onChange(updated);
	};

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.4,
			}}
			onBlur={onBlur}
		>
			<Collapsible open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
				<CollapsibleTrigger
					render={
						<div className="group/add-recipients -m-2 flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/40" />
					}
				>
					<h4 className="flex items-center gap-3 text-base font-semibold tracking-tight text-foreground">
						<span className="flex size-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-hover/add-recipients:bg-muted/70">
							<UsersIcon className="size-4" weight="regular" />
						</span>
						Add recipients
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isRecipientsOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<div className="space-y-5">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0 space-y-1">
								<p className="text-sm leading-relaxed text-muted-foreground">
									Add recipients to send documents to
								</p>
								{recipients && recipients.length > 0 ? (
									<p className="text-xs text-muted-foreground/80">
										{recipients.length} recipient
										{recipients.length !== 1 ? "s" : ""} added
									</p>
								) : null}
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-2">
								<AddRecipientDialog
									onSuccess={() => {
										// Refresh accepted people list after adding
										acceptedPeople.refetch();
									}}
								/>
								{acceptedPeople.data?.people &&
									acceptedPeople.data.people.length > 0 && (
										<Popover
											open={selectPopoverOpen}
											onOpenChange={(open) => {
												setSelectPopoverOpen(open);
												if (!open) setSearchQuery("");
											}}
										>
											<PopoverTrigger
												render={
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="gap-1.5 border-border/60 bg-background text-foreground/90 shadow-none"
													/>
												}
											>
												<UserIcon className="size-4" weight="regular" />
												<span className="hidden md:inline">
													Your connections
												</span>
											</PopoverTrigger>
											<PopoverContent
												className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
												align="end"
												sideOffset={8}
												initialFocus={(openType) =>
													!(openType === "mouse" || openType === "pen")
												}
											>
												<PopoverHeader className="gap-1 space-y-0 border-b border-border/50 bg-muted/20 px-5 py-4">
													<PopoverTitle className="text-lg font-semibold tracking-tight text-foreground">
														Add from connections
													</PopoverTitle>
													<PopoverDescription className="text-sm leading-relaxed text-muted-foreground">
														Choose someone you&apos;re already connected with on
														Filosign.
													</PopoverDescription>
												</PopoverHeader>

												<Command
													shouldFilter={false}
													className="rounded-none border-0 bg-transparent p-0 shadow-none"
												>
													<div className="space-y-1.5 border-b border-border/40 px-5 py-4">
														<Label
															htmlFor="connections-search"
															className={FIELD_LABEL_CLASS}
														>
															Search
														</Label>
														<CommandInput
															id="connections-search"
															placeholder="Name or email…"
															value={searchQuery}
															onValueChange={setSearchQuery}
															wrapperClassName="p-0"
															inputGroupClassName={
																CONNECTION_SEARCH_INPUT_GROUP_CLASS
															}
															className="h-9 text-sm text-foreground/90 placeholder:text-muted-foreground/45"
														/>
													</div>

													<CommandList className="max-h-[min(16rem,45vh)] px-2 py-2">
														<CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
															{acceptedPeople.isLoading
																? "Loading…"
																: "No recipients match your search."}
														</CommandEmpty>
														{filteredConnections.map((person) => {
															const normalized = getAddress(
																person.walletAddress,
															).toLowerCase();
															const isSelected =
																existingAddresses.has(normalized);
															const emailVal = person.email?.trim() ?? "";
															const primaryLabel =
																person.displayName?.trim() ||
																emailVal ||
																shortWallet(person.walletAddress);
															const secondaryLabel = emailVal
																? primaryLabel === emailVal
																	? null
																	: emailVal
																: "No email on profile";
															return (
																<CommandItem
																	key={person.walletAddress}
																	value={`${person.walletAddress} ${person.displayName ?? ""} ${person.email ?? ""}`}
																	onSelect={() =>
																		handleSelectConnection(person)
																	}
																	disabled={isSelected}
																	className={cn(
																		"my-0.5 rounded-lg border border-transparent px-3 py-2.5 transition-colors data-selected:border-border/50 data-selected:bg-muted/40",
																		isSelected &&
																			"cursor-not-allowed opacity-50 data-selected:bg-transparent data-selected:border-transparent",
																	)}
																>
																	<div className="flex min-w-0 flex-1 items-center gap-3">
																		<Avatar className="size-9 shrink-0 ring-1 ring-border/50">
																			{person.avatarUrl ? (
																				<AvatarImage src={person.avatarUrl} />
																			) : null}
																			<AvatarFallback className="bg-muted/40 text-xs font-medium text-muted-foreground">
																				{initialsFromName(
																					person.displayName,
																					person.walletAddress,
																				)}
																			</AvatarFallback>
																		</Avatar>
																		<div className="min-w-0 flex-1">
																			<p className="truncate text-sm font-medium text-foreground/90">
																				{primaryLabel}
																			</p>
																			{secondaryLabel !== null ? (
																				<p className="truncate text-xs leading-relaxed text-muted-foreground">
																					{secondaryLabel}
																				</p>
																			) : null}
																		</div>
																		{isSelected ? (
																			<CheckIcon
																				className="size-4 shrink-0 text-primary"
																				weight="bold"
																			/>
																		) : null}
																	</div>
																</CommandItem>
															);
														})}
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									)}
							</div>
						</div>

						{!recipients || recipients.length === 0 ? (
							<motion.div
								className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-8 py-12 text-center"
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 26,
								}}
							>
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
									<UsersIcon className="size-6" weight="regular" />
								</div>
								<p className="text-sm font-medium text-foreground/90">
									No recipients added
								</p>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Use{" "}
									<span className="font-medium text-foreground/80">
										Add recipient
									</span>{" "}
									or{" "}
									<span className="font-medium text-foreground/80">
										Your connections
									</span>{" "}
									when available.
								</p>
							</motion.div>
						) : (
							<CompactRecipientList
								recipients={recipients}
								onUpdateRecipient={updateRecipient}
								onRemoveRecipient={removeRecipient}
							/>
						)}

						{error && isTouched ? (
							<motion.p
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							>
								{error}
							</motion.p>
						) : null}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}

// Compact recipient card with inline text display and collapsible incentives
interface CompactRecipientListProps {
	recipients: Recipient[];
	onUpdateRecipient: (index: number, updates: Partial<Recipient>) => void;
	onRemoveRecipient: (index: number) => void;
}

function CompactRecipientList({
	recipients,
	onUpdateRecipient,
	onRemoveRecipient,
}: CompactRecipientListProps) {
	return (
		<motion.div
			className="space-y-3"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 26,
				delay: 0.06,
			}}
		>
			{recipients.map((recipient, index) => (
				<CompactRecipientCard
					key={`${recipient.walletAddress}-${index}`}
					recipient={recipient}
					index={index}
					onUpdate={onUpdateRecipient}
					onRemove={onRemoveRecipient}
				/>
			))}
		</motion.div>
	);
}

interface CompactRecipientCardProps {
	recipient: Recipient;
	index: number;
	onUpdate: (index: number, updates: Partial<Recipient>) => void;
	onRemove: (index: number) => void;
}

function CompactRecipientCard({
	recipient,
	index,
	onUpdate,
	onRemove,
}: CompactRecipientCardProps) {
	const [showIncentive, setShowIncentive] = useState(
		!!recipient.incentive?.token,
	);

	// Get token symbol if set
	const tokenSymbol = useMemo(() => {
		if (!recipient.incentive?.token) return null;
		const token = SUPPORTED_TOKENS.find(
			(t) =>
				t.address.toLowerCase() === recipient.incentive?.token?.toLowerCase(),
		);
		return token?.symbol || "Token";
	}, [recipient.incentive?.token]);

	return (
		<motion.div
			className="overflow-hidden rounded-xl border border-border/60 bg-muted/5 shadow-none"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 260,
				damping: 28,
			}}
		>
			<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
				<Avatar className="size-11 shrink-0 ring-1 ring-border/50">
					<AvatarFallback className="bg-muted/40 text-xs font-medium text-muted-foreground">
						{initialsFromName(recipient.name, recipient.walletAddress)}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1 space-y-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<p className="truncate text-base font-semibold tracking-tight text-foreground/90">
									{recipient.name?.trim() || "Unnamed recipient"}
								</p>
								{recipient.incentive?.token ? (
									<Badge
										variant="secondary"
										className="h-5 gap-1 border border-border/50 bg-muted/40 px-2 text-[10px] font-medium text-foreground/85"
									>
										<CoinsIcon className="size-3" weight="fill" />
										{recipient.incentive.amount || "0"} {tokenSymbol}
									</Badge>
								) : null}
							</div>
							{recipient.email?.trim() ? (
								<p className="truncate text-sm font-medium leading-relaxed text-foreground/85">
									{recipient.email}
								</p>
							) : (
								<p className="text-sm leading-relaxed text-muted-foreground/70">
									No email on envelope
								</p>
							)}
						</div>

						<div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1.5 border-border/60 shadow-none"
								onClick={() => setShowIncentive(!showIncentive)}
							>
								{showIncentive ? (
									<>
										<XIcon className="size-3.5" weight="bold" />
										Hide incentive
									</>
								) : (
									<>
										<CoinsIcon className="size-3.5" weight="regular" />
										Add incentive
									</>
								)}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								onClick={() => onRemove(index)}
							>
								Remove
							</Button>
						</div>
					</div>

					<div className="border-t border-border/40 pt-3">
						<div className="flex max-w-xs flex-col gap-1.5">
							<Label
								htmlFor={`recipient-role-${index}`}
								className={FIELD_LABEL_CLASS}
							>
								Role
							</Label>
							<Select
								value={recipient.role}
								onValueChange={(val) =>
									onUpdate(index, { role: val as Recipient["role"] })
								}
							>
								<SelectTrigger
									id={`recipient-role-${index}`}
									className={cn(FIELD_CONTROL_CLASS, "w-full")}
								>
									<SelectValue placeholder="Role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="signer">Signer</SelectItem>
									<SelectItem value="viewer">Viewer</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</div>

			{showIncentive ? (
				<IncentiveSection
					index={index}
					recipient={recipient}
					onUpdate={(updates) => onUpdate(index, updates)}
					onClose={() => setShowIncentive(false)}
				/>
			) : null}
		</motion.div>
	);
}

// Incentive section with token selection and amount
interface IncentiveSectionProps {
	index: number;
	recipient: Recipient;
	onUpdate: (updates: Partial<Recipient>) => void;
	onClose: () => void;
}

function IncentiveSection({
	index,
	recipient,
	onUpdate,
	onClose,
}: IncentiveSectionProps) {
	const baseId = `recipient-${index}-incentive`;

	const selectedIncentiveToken = useMemo(() => {
		const addr = recipient.incentive?.token;
		if (!addr) return null;
		return (
			SUPPORTED_TOKENS.find(
				(t) => t.address.toLowerCase() === addr.toLowerCase(),
			) ?? null
		);
	}, [recipient.incentive?.token]);

	const hasIncentiveValues =
		Boolean(recipient.incentive?.token?.trim()) ||
		Boolean(recipient.incentive?.amount?.trim());

	return (
		<div className="border-t border-border/50 bg-muted/10 px-5 py-4">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="text-sm font-medium text-foreground/90">
						Attach incentive
					</p>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Optional reward for this recipient when they complete signing.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={!hasIncentiveValues}
						className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
						aria-label="Clear incentive"
						title="Clear incentive"
						onClick={() =>
							onUpdate({
								incentive: { token: "", amount: "" },
							})
						}
					>
						<TrashIcon className="size-4" weight="regular" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="size-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
						aria-label="Close incentive section"
						title="Close"
						onClick={onClose}
					>
						<XIcon className="size-4" weight="bold" />
					</Button>
				</div>
			</div>

			<div className="mb-4 rounded-lg border border-border/50 bg-background px-3 py-2.5">
				<p className={FIELD_LABEL_CLASS}>Recipient wallet</p>
				<code
					className="mt-1 block break-all font-mono text-xs leading-relaxed text-muted-foreground"
					title={recipient.walletAddress}
				>
					{recipient.walletAddress}
				</code>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`${baseId}-token`} className={FIELD_LABEL_CLASS}>
						Token
					</Label>
					<Select
						value={recipient.incentive?.token || "none"}
						onValueChange={(val) => {
							if (val === "none") {
								onUpdate({
									incentive: { token: "", amount: "" },
								});
							} else if (val && isAddress(val)) {
								onUpdate({
									incentive: {
										token: getAddress(val),
										amount: recipient.incentive?.amount || "",
									},
								});
							}
						}}
					>
						<SelectTrigger
							id={`${baseId}-token`}
							className={cn(FIELD_CONTROL_CLASS, "w-full")}
						>
							{selectedIncentiveToken ? (
								<span className="flex min-w-0 flex-1 items-center gap-2 text-left">
									<img
										src={selectedIncentiveToken.icon}
										alt=""
										className="size-4 shrink-0 rounded-sm"
									/>
									<span className="min-w-0 truncate text-sm">
										<span className="font-medium text-foreground">
											{selectedIncentiveToken.symbol}
										</span>
										<span className="text-muted-foreground">
											{" "}
											· {selectedIncentiveToken.name}
										</span>
									</span>
								</span>
							) : recipient.incentive?.token ? (
								<span className="flex min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
									{
										erc20DisplayForChain(recipient.incentive.token as Address)
											.label
									}
								</span>
							) : (
								<SelectValue placeholder="Select token" />
							)}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							{SUPPORTED_TOKENS.map((token) => (
								<SelectItem key={token.address} value={token.address}>
									<span className="flex min-w-0 items-center gap-2">
										<img
											src={token.icon}
											alt=""
											className="size-4 shrink-0 rounded-sm"
										/>
										<span className="min-w-0 truncate">
											<span className="font-medium">{token.symbol}</span>
											<span className="text-muted-foreground">
												{" "}
												· {token.name}
											</span>
										</span>
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor={`${baseId}-amount`} className={FIELD_LABEL_CLASS}>
						Amount
					</Label>
					<Input
						id={`${baseId}-amount`}
						type="number"
						inputMode="decimal"
						value={recipient.incentive?.amount || ""}
						onChange={(e) =>
							onUpdate({
								incentive: {
									token: recipient.incentive?.token || "",
									amount: e.target.value,
								},
							})
						}
						placeholder="0"
						className={cn(
							FIELD_CONTROL_CLASS,
							"placeholder:text-muted-foreground/45",
						)}
						step="any"
					/>
				</div>
			</div>

			{recipient.incentive?.token ? (
				<div className="mt-4 rounded-lg border border-border/60 bg-background p-3">
					<p className="mb-2 text-[11px] leading-relaxed text-destructive">
						You must hold enough tokens. They will be locked when sending.
					</p>
					{(() => {
						const currentToken = SUPPORTED_TOKENS.find(
							(t) =>
								t.address.toLowerCase() ===
								recipient.incentive?.token?.toLowerCase(),
						);
						if (!currentToken) return null;

						return (
							<div className="space-y-2">
								<TokenBalanceChecker
									tokenAddress={currentToken.address as Address}
									decimals={currentToken.decimals}
									symbol={currentToken.symbol}
								/>
								{currentToken.faucets && currentToken.faucets.length > 0 && (
									<div className="flex flex-wrap gap-1.5 items-center text-[10px]">
										<span className="text-muted-foreground">
											Need {currentToken.symbol}?
										</span>
										{currentToken.faucets.map((faucet) => (
											<a
												key={faucet.url}
												href={faucet.url}
												target="_blank"
												rel="noreferrer"
												className="text-primary hover:underline"
											>
												{faucet.name}
											</a>
										))}
									</div>
								)}
							</div>
						);
					})()}
				</div>
			) : null}
		</div>
	);
}

function TokenBalanceChecker({
	tokenAddress,
	decimals,
	symbol,
}: {
	tokenAddress: Address;
	decimals: number;
	symbol: string;
}) {
	const { address } = useAccount();
	const { data, refetch, isFetching } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: false },
	});

	const [hasChecked, setHasChecked] = useState(false);

	const handleCheck = async () => {
		await refetch();
		setHasChecked(true);
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleCheck}
				disabled={isFetching || !address}
				className="h-8 gap-1.5 border-border/60 px-3 text-sm shadow-none"
			>
				{isFetching ? "Checking…" : "Check balance"}
			</Button>
			{hasChecked && !isFetching && data !== undefined ? (
				<span className="text-sm font-medium text-foreground/90">
					<span className="mr-1 text-muted-foreground">Balance:</span>
					{Number(formatUnits(data, decimals)).toLocaleString(undefined, {
						maximumFractionDigits: 4,
					})}{" "}
					{symbol}
				</span>
			) : null}
		</div>
	);
}
