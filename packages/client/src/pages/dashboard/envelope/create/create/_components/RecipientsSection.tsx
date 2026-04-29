import { useAcceptedPeople } from "@filosign/react/hooks";
import {
	CaretDownIcon,
	CheckIcon,
	CoinsIcon,
	PaperPlaneTiltIcon,
	UserIcon,
	UsersIcon,
	XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
	type Control,
	type FieldArrayWithId,
	type UseFieldArrayAppend,
	type UseFieldArrayRemove,
	useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import {
	type Address,
	erc20Abi,
	formatUnits,
	getAddress,
	isAddress,
} from "viem";
import { useAccount, useReadContract } from "wagmi";
import { WORLD_CHAIN_SEPOLIA_TOKENS } from "@/src/constants";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/lib/components/ui/form";
import { Input } from "@/src/lib/components/ui/input";
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
import type { EnvelopeForm } from "../../types";

interface RecipientsSectionProps {
	control: Control<EnvelopeForm>;
	fields: FieldArrayWithId<EnvelopeForm, "recipients", "id">[];
	append: UseFieldArrayAppend<EnvelopeForm, "recipients">;
	remove: UseFieldArrayRemove;
}

export default function RecipientsSection({
	control,
	fields,
	append,
	remove,
}: RecipientsSectionProps) {
	const recipients = useWatch({ control, name: "recipients" });
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
		() => new Set(fields.map((f) => f.walletAddress?.toLowerCase())),
		[fields],
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

		append({
			name: person.displayName || "",
			email: "",
			walletAddress: normalized,
			role: "signer",
		});
		setSelectPopoverOpen(false);
		setSearchQuery("");
		toast.success("Recipient added");
	};

	const handleRequestSuccess = () => {};

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
		>
			<Collapsible open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
				<CollapsibleTrigger asChild>
					<div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors p-2 -m-2 rounded-md group/add-recipients">
						<h4 className="flex items-center gap-3">
							<UsersIcon
								className={cn(
									"size-5 text-muted-foreground transition-transform duration-200",
								)}
							/>
							Add recipients
							{fields.length > 0 && (
								<span className="text-sm text-muted-foreground">
									({fields.length})
								</span>
							)}
						</h4>
						<CaretDownIcon
							className={cn(
								"size-4 text-muted-foreground transition-transform duration-200",
								isRecipientsOpen && "rotate-180",
							)}
							weight="bold"
						/>
					</div>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<FormField
						control={control}
						name="recipients"
						rules={{
							validate: (value) => {
								if (!value || value.length === 0) {
									return "At least 1 recipient is required";
								}
								return true;
							},
						}}
						render={() => (
							<FormItem>
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-2">
										<FormLabel>Recipients</FormLabel>
										<div className="flex items-center gap-3">
											<AddRecipientDialog
												trigger={
													<Button type="button" variant="primary">
														<PaperPlaneTiltIcon className="size-4" />
														<p className="hidden md:block">Add New Recipient</p>
													</Button>
												}
												onSuccess={handleRequestSuccess}
											/>
											<Popover
												open={selectPopoverOpen}
												onOpenChange={setSelectPopoverOpen}
											>
												<PopoverTrigger asChild>
													<Button type="button" variant="outline">
														<UserIcon className="size-4" />
														<p className="hidden md:block">Your Contacts</p>
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-80 p-0 mt-2" align="end">
													<Command>
														<CommandInput
															placeholder="Search connections..."
															value={searchQuery}
															onValueChange={setSearchQuery}
														/>
														<CommandList>
															<CommandEmpty>
																{acceptedPeople.isLoading
																	? "Loading..."
																	: "No connections found"}
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
																				<div className="text-xs text-muted-foreground font-mono truncate">
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
										</div>
									</div>

									{fields.length === 0 ? (
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
													<p className="text-xs text-muted-foreground">
														Add recipients to send documents to
													</p>
												</motion.div>
											</motion.div>
										</motion.div>
									) : (
										<CompactRecipientList
											fields={fields}
											control={control}
											recipients={recipients}
											remove={remove}
										/>
									)}
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}

// Compact recipient card with inline text display and collapsible incentives
interface CompactRecipientListProps {
	fields: FieldArrayWithId<EnvelopeForm, "recipients", "id">[];
	control: Control<EnvelopeForm>;
	recipients: EnvelopeForm["recipients"] | undefined;
	remove: UseFieldArrayRemove;
}

function CompactRecipientList({
	fields,
	control,
	recipients,
	remove,
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
			{fields.map((field, index) => (
				<CompactRecipientCard
					key={field.id}
					index={index}
					control={control}
					recipientData={recipients?.[index]}
					onRemove={() => remove(index)}
				/>
			))}
		</motion.div>
	);
}

interface CompactRecipientCardProps {
	index: number;
	control: Control<EnvelopeForm>;
	recipientData: EnvelopeForm["recipients"][number] | undefined;
	onRemove: () => void;
}

function CompactRecipientCard({
	index,
	control,
	recipientData,
	onRemove,
}: CompactRecipientCardProps) {
	const [showIncentive, setShowIncentive] = useState(
		!!recipientData?.incentive?.token,
	);

	// Format wallet address for display
	const formatWallet = (addr: string) => {
		if (!addr || addr.length < 10) return addr;
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	};

	// Get token symbol if set
	const tokenSymbol = useMemo(() => {
		if (!recipientData?.incentive?.token) return null;
		const token = WORLD_CHAIN_SEPOLIA_TOKENS.find(
			(t) =>
				t.address.toLowerCase() ===
				recipientData.incentive?.token?.toLowerCase(),
		);
		return token?.symbol || "Token";
	}, [recipientData?.incentive?.token]);

	return (
		<motion.div
			className="rounded-lg border bg-muted/5 border-border/60 overflow-hidden"
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				duration: 0.3,
			}}
		>
			{/* Main row with better spacing */}
			<div className="flex items-start gap-4 p-4">
				{/* Avatar */}
				<div className="shrink-0 pt-0.5">
					<div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
						<UserIcon className="size-5 text-primary" />
					</div>
				</div>

				{/* Info column - fixed display, no editing */}
				<div className="flex-1 min-w-0 space-y-1">
					{/* Name and Role selector row */}
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-medium text-sm">
							{recipientData?.name || "Unnamed"}
						</span>
						<FormField
							control={control}
							name={`recipients.${index}.role`}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className="h-7 w-28 text-xs px-2">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="signer">Signer</SelectItem>
										<SelectItem value="cc">CC</SelectItem>
										<SelectItem value="approver">Approver</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
						{recipientData?.incentive?.token && (
							<Badge
								variant="outline"
								className="text-[10px] h-5 px-1.5 border-primary/30"
							>
								<CoinsIcon className="size-3" />
								{recipientData.incentive.amount || "0"} {tokenSymbol}
							</Badge>
						)}
					</div>

					{/* Fixed contact info - wallet and email (read-only) */}
					<div className="text-xs text-muted-foreground font-mono">
						{formatWallet(recipientData?.walletAddress || "")}
					</div>
					{recipientData?.email && (
						<div className="text-xs text-muted-foreground">
							{recipientData.email}
						</div>
					)}
				</div>

				{/* Actions - text buttons instead of icons */}
				<div className="shrink-0 flex self-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 text-xs px-3"
						onClick={() => setShowIncentive(!showIncentive)}
					>
						{showIncentive ? "Hide Incentive" : "Attach Incentive"}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 text-xs px-3 text-destructive hover:text-destructive"
						onClick={onRemove}
					>
						Remove
					</Button>
				</div>
			</div>

			{/* Collapsible incentive section */}
			{showIncentive && (
				<IncentiveSection
					index={index}
					control={control}
					recipientData={recipientData}
					onClose={() => setShowIncentive(false)}
				/>
			)}
		</motion.div>
	);
}

// Incentive section with token selection and amount
interface IncentiveSectionProps {
	index: number;
	control: Control<EnvelopeForm>;
	recipientData: EnvelopeForm["recipients"][number] | undefined;
	onClose: () => void;
}

function IncentiveSection({
	index,
	control,
	recipientData,
	onClose,
}: IncentiveSectionProps) {
	return (
		<div className="border-t border-border/60 px-3 py-3">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-muted-foreground">
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
				<FormField
					control={control}
					name={`recipients.${index}.incentive.token`}
					rules={{
						validate: (value) => {
							if (value && !isAddress(value)) return "Invalid token";
							return true;
						},
					}}
					render={({ field }) => (
						<FormItem className="space-y-1">
							<Select
								value={field.value || "none"}
								onValueChange={(val) => {
									if (val === "none") {
										field.onChange("");
									} else if (val && isAddress(val)) {
										field.onChange(getAddress(val));
									}
								}}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Select token" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{WORLD_CHAIN_SEPOLIA_TOKENS.map((token) => (
										<SelectItem key={token.address} value={token.address}>
											<div className="flex items-center gap-2">
												<img
													src={token.icon}
													alt={token.name}
													className="size-4"
												/>
												<span className="text-xs">{token.symbol}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage className="text-xs" />
						</FormItem>
					)}
				/>
				<FormField
					control={control}
					name={`recipients.${index}.incentive.amount`}
					rules={{
						validate: (value, formValues) => {
							const token = formValues.recipients[index]?.incentive?.token;
							if (token && !value) return "Amount required";
							if (value && !token) return "Select token first";
							if (value && Number.isNaN(Number(value))) return "Invalid amount";
							if (value && Number(value) <= 0) return "Must be > 0";
							return true;
						},
					}}
					render={({ field }) => (
						<FormItem className="space-y-1">
							<Input
								{...field}
								value={field.value || ""}
								placeholder="Amount"
								className="h-8 text-xs"
								type="number"
								step="any"
							/>
							<FormMessage className="text-xs" />
						</FormItem>
					)}
				/>
			</div>

			{/* Token warning and balance checker */}
			{recipientData?.incentive?.token && (
				<div className="mt-3 p-2.5 bg-background rounded-md border border-border/60">
					<p className="text-[11px] text-destructive leading-snug mb-2">
						You must hold enough tokens. They will be locked when sending.
					</p>
					{(() => {
						const currentToken = WORLD_CHAIN_SEPOLIA_TOKENS.find(
							(t) =>
								t.address.toLowerCase() ===
								recipientData.incentive?.token?.toLowerCase(),
						);
						if (!currentToken) return null;

						return (
							<div className="space-y-2">
								<TokenBalanceChecker
									tokenAddress={currentToken.address as Address}
									decimals={currentToken.decimals}
									symbol={currentToken.symbol}
								/>
								{currentToken.faucets?.length > 0 && (
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
				className="h-7 text-xs px-3 bg-background/50"
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
