import { useAcceptedPeople } from "@filosign/react/hooks";
import {
	CaretDownIcon,
	CheckIcon,
	MinusIcon,
	PaperPlaneTiltIcon,
	UserIcon,
	UsersIcon,
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
														<p className="hidden md:block">Send Request</p>
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
														<p className="hidden md:block">Select Recipient</p>
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
										<motion.div
											className="space-y-3"
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
												<motion.div
													key={field.id}
													className="p-4 rounded-lg border-1 border-border/60 bg-background space-y-3"
													initial={{ opacity: 0, scale: 0.9 }}
													animate={{ opacity: 1, scale: 1 }}
													transition={{
														type: "spring",
														stiffness: 230,
														damping: 25,
														duration: 0.3,
													}}
												>
													<div className="flex items-start justify-between gap-4">
														<div className="flex-1 flex flex-col gap-4">
															<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
																<FormField
																	control={control}
																	name={`recipients.${index}.name`}
																	rules={{
																		required: "Name is required",
																	}}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground">
																				Name
																			</FormLabel>
																			<Input
																				{...field}
																				placeholder="Recipient name"
																				autoComplete="name"
																			/>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
																<FormField
																	control={control}
																	name={`recipients.${index}.email`}
																	rules={{
																		pattern: {
																			value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
																			message: "Invalid email format",
																		},
																	}}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground">
																				Email
																			</FormLabel>
																			<Input
																				{...field}
																				type="email"
																				placeholder="email@example.com"
																				autoComplete="email"
																			/>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
																<FormField
																	control={control}
																	name={`recipients.${index}.walletAddress`}
																	rules={{
																		required: "Wallet address is required",
																		validate: (value) => {
																			if (!value)
																				return "Wallet address is required";
																			if (!isAddress(value)) {
																				return "Invalid wallet address";
																			}
																			return true;
																		},
																	}}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground">
																				Wallet Address
																			</FormLabel>
																			<Input
																				{...field}
																				placeholder="0x..."
																				className="font-mono"
																				autoComplete="off"
																				onBlur={(e) => {
																					const value = e.target.value;
																					if (isAddress(value)) {
																						field.onChange(getAddress(value));
																					}
																				}}
																			/>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
																<FormField
																	control={control}
																	name={`recipients.${index}.role`}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground">
																				Role
																			</FormLabel>
																			<Select
																				value={field.value}
																				onValueChange={field.onChange}
																			>
																				<SelectTrigger>
																					<SelectValue />
																				</SelectTrigger>
																				<SelectContent>
																					<SelectItem value="signer">
																						Signer
																					</SelectItem>
																					<SelectItem value="cc">CC</SelectItem>
																					<SelectItem value="approver">
																						Approver
																					</SelectItem>
																				</SelectContent>
																			</Select>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
															</div>
															{/* Incentive Fields */}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
																<FormField
																	control={control}
																	name={`recipients.${index}.incentive.token`}
																	rules={{
																		validate: (value) => {
																			if (value && !isAddress(value))
																				return "Invalid token address";
																			return true;
																		},
																	}}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground flex justify-between">
																				<span>Incentive Token</span>
																				<span className="text-xs text-muted-foreground font-normal">
																					Optional
																				</span>
																			</FormLabel>
																			<Select
																				value={field.value || "none"}
																				onValueChange={(val) => {
																					if (val === "none") {
																						field.onChange("");
																					} else if (val && isAddress(val)) {
																						field.onChange(getAddress(val));
																					} else {
																						field.onChange(val);
																					}
																				}}
																			>
																				<SelectTrigger className="font-mono">
																					<SelectValue placeholder="Select token" />
																				</SelectTrigger>
																				<SelectContent>
																					<SelectItem value="none">
																						None
																					</SelectItem>
																					{WORLD_CHAIN_SEPOLIA_TOKENS.map(
																						(token) => (
																							<SelectItem
																								key={token.address}
																								value={token.address}
																							>
																								<img
																									src={token.icon}
																									alt={token.name}
																									className="size-4"
																								/>
																								<p className="">{token.name} ({token.symbol})</p>
																							</SelectItem>
																						),
																					)}
																				</SelectContent>
																			</Select>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
																<FormField
																	control={control}
																	name={`recipients.${index}.incentive.amount`}
																	rules={{
																		validate: (value, formValues) => {
																			const token =
																				formValues.recipients[index]?.incentive
																					?.token;
																			if (token && !value)
																				return "Amount required if token set";
																			if (value && !token)
																				return "Token required if amount set";
																			if (value && Number.isNaN(Number(value)))
																				return "Invalid amount";
																			if (value && Number(value) <= 0)
																				return "Amount must be greater than 0";
																			return true;
																		},
																	}}
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="text-sm font-semibold text-foreground flex justify-between">
																				<span>Incentive Amount</span>
																				<span className="text-xs text-muted-foreground font-normal">
																					Optional
																				</span>
																			</FormLabel>
																			<Input
																				{...field}
																				value={field.value || ""}
																				placeholder="e.g. 1.5"
																				autoComplete="off"
																			/>
																			<FormMessage />
																		</FormItem>
																	)}
																/>
															</div>
															{/* Incentive Faucet & Warning */}
															{recipients?.[index]?.incentive?.token && (
																<div className="mt-4 p-3 bg-card rounded-md text-sm text-foreground/80 space-y-2 border border-border">
																	<p className="flex items-center text-destructive gap-1.5 leading-snug">
																		As the sender, you must hold enough tokens
																		to pay these incentives. The incentives will
																		be locked into the contract upon sending. If
																		you lack sufficient balance or allowance,
																		your transaction will fail.
																	</p>
																	{(() => {
																		const currentToken =
																			WORLD_CHAIN_SEPOLIA_TOKENS.find(
																				(t) =>
																					t.address.toLowerCase() ===
																					recipients[
																						index
																					].incentive?.token?.toLowerCase(),
																			);
																		if (currentToken) {
																			const FaucetsSection = currentToken
																				.faucets?.length ? (
																				<div className="flex flex-wrap gap-2 items-center text-xs">
																					<span className="font-semibold text-muted-foreground">
																						Need {currentToken.symbol}? Faucets:
																					</span>
																					{currentToken.faucets.map(
																						(faucet) => (
																							<a
																								key={faucet.url}
																								href={faucet.url}
																								target="_blank"
																								rel="noreferrer"
																								className="text-chart-1 font-semibold hover:underline transition-colors"
																							>
																								{faucet.name}
																							</a>
																						),
																					)}
																				</div>
																			) : null;

																			return (
																				<div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-3">
																					<TokenBalanceChecker
																						tokenAddress={
																							currentToken.address as Address
																						}
																						decimals={currentToken.decimals}
																						symbol={currentToken.symbol}
																					/>
																					{FaucetsSection}
																				</div>
																			);
																		}
																		return null;
																	})()}
																</div>
															)}
														</div>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => remove(index)}
															className="text-destructive hover:text-destructive"
														>
															<MinusIcon className="size-4" />
														</Button>
													</div>
												</motion.div>
											))}
										</motion.div>
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
