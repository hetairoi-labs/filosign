import { GearIcon } from "@phosphor-icons/react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { FormField, FormLabel } from "@/src/lib/components/ui/form";
import { Separator } from "@/src/lib/components/ui/separator";
import { Switch } from "@/src/lib/components/ui/switch";
import { SaveButton } from "./components/SaveButton";

// Reusable preference field component
const PreferenceField = ({
	name,
	label,
	description,
}: {
	name: `preferences.${keyof { emailNotifications: boolean; pushNotifications: boolean; twoFactorAuth: boolean }}`;
	label: string;
	description: string;
}) => (
	<>
		<FormField
			name={name}
			render={({ field }) => (
				<div className="flex justify-between items-center">
					<div className="space-y-0.5">
						<FormLabel className="text-base">{label}</FormLabel>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>
					<Switch checked={field.value} onCheckedChange={field.onChange} />
				</div>
			)}
		/>
		<Separator />
	</>
);

interface AccountPreferencesSectionProps {
	form: any;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
}

export function AccountPreferencesSection({
	sectionState,
}: AccountPreferencesSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<GearIcon className="size-5" />
					Account Preferences
				</CardTitle>
				<CardDescription>
					Manage your account settings and preferences
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<PreferenceField
					name="preferences.emailNotifications"
					label="Email Notifications"
					description="Receive email updates about your account activity"
				/>
				<PreferenceField
					name="preferences.pushNotifications"
					label="Push Notifications"
					description="Receive push notifications on your devices"
				/>
				<PreferenceField
					name="preferences.twoFactorAuth"
					label="Two-Factor Authentication"
					description="Add an extra layer of security to your account"
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
