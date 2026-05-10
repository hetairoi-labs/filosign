import { useAcceptedPeople } from "@filosign/react/hooks";
import {
	CaretDownIcon,
	CheckIcon,
	CoinsIcon,
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
import { SUPPORTED_TOKENS } from "@/src/constants";
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
import {
	Popover,
	PopoverContent,
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
import type { Recipient } from "../../types";
import { useRecipients } from "./envelope-draft-context";

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
			return (
				displayName.includes(query) ||
				wallet.includes(query) ||
				username.includes(query)
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
	}) => {
		const normalized = getAddress(person.walletAddress);
		if (existingAddresses.has(normalized.toLowerCase())) {
			toast.error("Recipient already added");
			return;
		}

		const newRecipient: Recipient = {
			name: person.displayName || "",
			email: "",
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
						<div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors p-2 -m-2 rounded-md group/add-recipients" />
					}
				>
					<h4 className="flex items-center gap-3">
						<UsersIcon
							className={cn(
								"size-5 text-muted-foreground transition-colors duration-200",
							)}
						/>
						Add Recipients
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
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<p className="text-sm text-muted-foreground">
									Add recipients to send documents to
								</p>
								{recipients && recipients.length > 0 && (
									<span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full">
										{recipients.length} recipient
										{recipients.length !== 1 ? "s" : ""}
									</span>
								)}
							</div>

							<div className="flex items-center gap-2">
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
											onOpenChange={setSelectPopoverOpen}
										>
											<PopoverTrigger
												render={<Button type="button" variant="outline" />}
											>
												<UserIcon className="size-4" />
												<p className="hidden md:block">Your Recipients</p>
											</PopoverTrigger>
											<PopoverContent className="w-80 p-0 mt-2" align="end">
												<Command>
													<CommandInput
														placeholder="Search recipients..."
														value={searchQuery}
														onValueChange={setSearchQuery}
													/>
													<CommandList>
														<CommandEmpty>
															{acceptedPeople.isLoading
																? "Loading..."
																: "No recipients found"}
														</CommandEmpty>
														{filteredConnections.map((person) => {
															const normalized = getAddress(
																person.walletAddress,
															).toLowerCase();
															const isSelected =
																existingAddresses.has(normalized);
															return (
																<CommandItem
																	key={person.walletAddress}
																	onSelect={() =>
																		handleSelectConnection(person)
																	}
																	disabled={isSelected}
																	className={cn(
																		isSelected &&
																			"opacity-50 cursor-not-allowed",
																	)}
																>
																	<div className="flex items-center gap-3 w-full">
																		<Avatar className="size-8">
																			{person.avatarUrl && (
																				<AvatarImage src={person.avatarUrl} />
																			)}
																			<AvatarFallback>
																				<UserIcon className="size-4" />
																			</AvatarFallback>
																		</Avatar>
																		<div className="flex-1 min-w-0">
																			<div className="font-medium text-sm truncate">
																				{person.displayName ||
																					`${person.walletAddress.slice(0, 6)}...${person.walletAddress.slice(-4)}`}
																			</div>
																			<div className="text-sm text-muted-foreground font-mono truncate">
																				{person.walletAddress.slice(0, 10)}...
																			</div>
																		</div>
																		{isSelected && (
																			<CheckIcon className="size-4 text-primary" />
																		)}
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
								className="border-2 border-primary/20 rounded-lg p-16 text-center transition-colors bg-muted/5 hover:border-muted-foreground/50"
								transition={{ duration: 0.2 }}
							>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										type: "spring",
										stiffness: 230,
										damping: 25,
										delay: 0.1,
									}}
									className="space-y-6"
								>
									<motion.div
										className="flex justify-center"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.2,
										}}
									>
										<motion.div
											className="p-6 rounded-full bg-muted/20"
											transition={{
												type: "spring",
												stiffness: 230,
												damping: 25,
												duration: 0.3,
											}}
										>
											<UsersIcon className="h-12 w-12 text-primary" />
										</motion.div>
									</motion.div>
									<motion.div
										className="space-y-4"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											type: "spring",
											stiffness: 230,
											damping: 25,
											delay: 0.3,
										}}
									>
										<p className="text-muted-foreground">
											No recipients selected
										</p>
										<p className="text-sm text-muted-foreground">
											Add recipients to send documents to
										</p>
									</motion.div>
								</motion.div>
							</motion.div>
						) : (
							<CompactRecipientList
								recipients={recipients}
								onUpdateRecipient={updateRecipient}
								onRemoveRecipient={removeRecipient}
							/>
						)}

						{/* Validation error */}
						{error && isTouched && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-destructive font-medium"
							>
								{error}
							</motion.p>
						)}
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
			className="space-y-2"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				delay: 0.1,
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
			className="rounded-lg border bg-background shadow-sm overflow-hidden"
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				duration: 0.3,
			}}
		>
			{/* Main row */}
			<div className="flex items-start gap-4 p-4">
				{/* Avatar */}
				<div className="shrink-0">
					<div className="size-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
						<UserIcon className="size-5 text-primary" weight="duotone" />
					</div>
				</div>

				{/* Info column */}
				<div className="flex-1 min-w-0 space-y-1.5">
					{/* Name row */}
					<div className="flex items-center gap-2">
						<span className="font-semibold text-sm text-foreground">
							{recipient.name || "Unnamed"}
						</span>
						{recipient.incentive?.token && (
							<Badge
								variant="secondary"
								className="text-[10px] h-5 px-2 font-medium"
							>
								<CoinsIcon className="size-3" weight="fill" />
								{recipient.incentive.amount || "0"} {tokenSymbol}
							</Badge>
						)}
					</div>

					{/* Wallet address */}
					<div className="text-sm font-mono bg-muted/20 rounded-sm px-2 py-1 my-2 inline-block">
						{recipient.walletAddress}
					</div>

					{/* Email */}
					{recipient.email && (
						<div className="text-sm text-foreground/70">{recipient.email}</div>
					)}

					{/* Role selector row */}
					<div className="flex items-center gap-2 pt-1">
						<span className="text-sm text-foreground/60">Role:</span>
						<Select
							value={recipient.role}
							onValueChange={(val) =>
								onUpdate(index, { role: val as Recipient["role"] })
							}
						>
							<SelectTrigger className="h-7 w-32 text-sm px-2">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="signer">Signer</SelectItem>
								<SelectItem value="cc">Viewer</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Actions */}
				<div className="shrink-0 flex self-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9 text-sm px-3 font-medium"
						onClick={() => setShowIncentive(!showIncentive)}
					>
						{showIncentive ? (
							<>
								<XIcon className="size-3.5 mr-1.5" />
								Hide
							</>
						) : (
							<>
								<CoinsIcon className="size-3.5 mr-1.5" />
								Add Incentive
							</>
						)}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 text-sm px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => onRemove(index)}
					>
						Remove
					</Button>
				</div>
			</div>

			{/* Collapsible incentive section */}
			{showIncentive && (
				<IncentiveSection
					recipient={recipient}
					onUpdate={(updates) => onUpdate(index, updates)}
					onClose={() => setShowIncentive(false)}
				/>
			)}
		</motion.div>
	);
}

// Incentive section with token selection and amount
interface IncentiveSectionProps {
	recipient: Recipient;
	onUpdate: (updates: Partial<Recipient>) => void;
	onClose: () => void;
}

function IncentiveSection({
	recipient,
	onUpdate,
	onClose,
}: IncentiveSectionProps) {
	return (
		<div className="border-t border-border/60 px-3 py-3">
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium text-muted-foreground">
					Attach Incentive
				</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-6 w-6 p-0"
					onClick={onClose}
				>
					<XIcon className="size-3" />
				</Button>
			</div>
			<div className="grid grid-cols-2 gap-3">
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
					<SelectTrigger className="h-8 text-sm">
						<SelectValue placeholder="Select token" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{SUPPORTED_TOKENS.map((token) => (
							<SelectItem key={token.address} value={token.address}>
								<div className="flex items-center gap-2">
									<img src={token.icon} alt={token.name} className="size-4" />
									<span className="text-sm">{token.symbol}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<input
					type="number"
					value={recipient.incentive?.amount || ""}
					onChange={(e) =>
						onUpdate({
							incentive: {
								token: recipient.incentive?.token || "",
								amount: e.target.value,
							},
						})
					}
					placeholder="Amount"
					className="h-8 text-sm px-3 rounded-md border border-input bg-background"
					step="any"
				/>
			</div>

			{/* Token warning and balance checker */}
			{recipient.incentive?.token && (
				<div className="mt-3 p-2.5 bg-background rounded-md border border-border/60">
					<p className="text-[11px] text-destructive leading-snug mb-2">
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
			)}
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
	const { data, refetch, isFetching, error } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: false },
	});

	console.log(error);

	const [hasChecked, setHasChecked] = useState(false);

	const handleCheck = async () => {
		await refetch();
		setHasChecked(true);
	};

	return (
		<div className="flex items-center gap-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleCheck}
				disabled={isFetching || !address}
				className="h-7 text-sm px-3 bg-background/50"
			>
				{isFetching ? "Checking..." : "Check Balance"}
			</Button>
			{hasChecked && !isFetching && data !== undefined && (
				<span className="text-sm font-medium">
					<span className="text-muted-foreground mr-1">Balance:</span>
					{Number(formatUnits(data, decimals)).toLocaleString(undefined, {
						maximumFractionDigits: 4,
					})}{" "}
					{symbol}
				</span>
			)}
		</div>
	);
}
