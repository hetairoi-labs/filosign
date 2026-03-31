import { UserIcon } from "@phosphor-icons/react";
import type { UseFormReturn } from "react-hook-form";
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
import { Textarea } from "@/src/lib/components/ui/textarea";
import { SaveButton } from "./components/SaveButton";
import type { ProfileForm } from "./hooks/use-section-state";

interface PersonalInfoSectionProps {
	form: UseFormReturn<ProfileForm>;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
}

export function PersonalInfoSection({
	form,
	sectionState,
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

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="personal.firstName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>First Name</FormLabel>
								<FormControl>
									<Input placeholder="Enter your first name" {...field} />
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
									<Input placeholder="Enter your last name" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="personal.bio"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Bio</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Tell us about yourself..."
									rows={3}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
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
