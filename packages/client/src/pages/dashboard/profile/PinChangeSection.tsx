import { LockIcon } from "@phosphor-icons/react";
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
import { SaveButton } from "./components/SaveButton";
import type { ProfileForm } from "./hooks/use-section-state";

interface PinChangeSectionProps {
	form: UseFormReturn<ProfileForm>;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
}

export function PinChangeSection({
	form,
	sectionState,
}: PinChangeSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<LockIcon className="size-5" />
					Change PIN
				</CardTitle>
				<CardDescription>
					Enter your current 6-digit PIN and choose a new one
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<FormField
					control={form.control}
					name="pin.current"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Current PIN</FormLabel>
							<FormControl>
								<Input
									type="password"
									placeholder="Enter current PIN"
									maxLength={6}
									inputMode="numeric"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="pin.new"
						render={({ field }) => (
							<FormItem>
								<FormLabel>New PIN</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="Enter new PIN"
										maxLength={6}
										inputMode="numeric"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="pin.confirm"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Confirm PIN</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="Confirm new PIN"
										maxLength={6}
										inputMode="numeric"
										{...field}
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
					disabled={
						sectionState.state.isSaved ||
						sectionState.state.isSaving ||
						!form.watch("pin.current") ||
						!form.watch("pin.new") ||
						!form.watch("pin.confirm")
					}
					isLoading={sectionState.state.isSaving}
					isSaved={sectionState.state.isSaved}
					error={sectionState.state.error}
				/>
			</CardContent>
		</Card>
	);
}
