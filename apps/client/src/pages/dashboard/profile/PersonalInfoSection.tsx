import { PencilSimpleIcon, UserIcon } from "@phosphor-icons/react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/lib/components/ui/form";
import { Input } from "@/src/lib/components/ui/input";
import { SaveButton } from "./components/SaveButton";
import type { ProfileForm } from "./hooks/use-section-state";

interface PersonalInfoSectionProps {
	form: UseFormReturn<ProfileForm>;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
	primaryEmailWithPrivy?: {
		onPress: () => void;
		disabled: boolean;
		pending: boolean;
		mode: "update" | "link";
	};
}

export function PersonalInfoSection({
	form,
	sectionState,
	primaryEmailWithPrivy,
}: PersonalInfoSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<UserIcon className="size-5" />
					Personal Information
				</CardTitle>
				<CardDescription>
					Update your personal details and contact information
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<FormField
					control={form.control}
					name="personal.walletAddress"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Wallet Address</FormLabel>
							<FormControl>
								<div className="relative">
									<Input
										placeholder="0x..."
										className="font-mono text-sm"
										readOnly
										disabled
										{...field}
									/>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="personal.email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Primary email</FormLabel>
							<FormControl>
								<div className="flex gap-1.5 items-center">
									<Input
										placeholder="email@example.com"
										type="email"
										readOnly
										disabled
										className="min-w-0 flex-1"
										{...field}
									/>
									{primaryEmailWithPrivy ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="shrink-0 text-muted-foreground hover:text-foreground"
											disabled={
												primaryEmailWithPrivy.disabled ||
												primaryEmailWithPrivy.pending
											}
											onClick={primaryEmailWithPrivy.onPress}
											title={
												primaryEmailWithPrivy.mode === "update"
													? "Change email in Privy"
													: "Link email in Privy"
											}
											aria-label={
												primaryEmailWithPrivy.mode === "update"
													? "Change primary email in Privy"
													: "Link an email address in Privy"
											}
										>
											{primaryEmailWithPrivy.pending ? (
												<span
													className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
													aria-hidden
												/>
											) : (
												<PencilSimpleIcon className="size-4" weight="bold" />
											)}
										</Button>
									) : null}
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="personal.firstName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>First Name</FormLabel>
								<FormControl>
									<Input
										placeholder="Enter your first name"
										{...field}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												sectionState.save();
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="personal.lastName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Last Name</FormLabel>
								<FormControl>
									<Input
										placeholder="Enter your last name"
										{...field}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												sectionState.save();
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<SaveButton
					show={sectionState.hasChanges || sectionState.state.isSaved}
					onSave={sectionState.save}
					disabled={sectionState.state.isSaved || sectionState.state.isSaving}
					isLoading={sectionState.state.isSaving}
					isSaved={sectionState.state.isSaved}
					error={sectionState.state.error}
				/>
			</CardContent>
		</Card>
	);
}
