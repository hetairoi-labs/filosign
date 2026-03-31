import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

// Simplified form validation schema
const profileSchema = z.object({
	personal: z.object({
		firstName: z
			.string()
			.min(1, "First name is required")
			.max(50, "First name too long"),
		lastName: z
			.string()
			.min(1, "Last name is required")
			.max(50, "Last name too long"),
		bio: z.string().max(500, "Bio must be less than 500 characters"),
		walletAddress: z.string().optional(),
	}),
	preferences: z.object({
		emailNotifications: z.boolean(),
		pushNotifications: z.boolean(),
		twoFactorAuth: z.boolean(),
	}),
	profilePicture: z.string().nullable(),
	pin: z
		.object({
			current: z
				.string()
				.min(1, "Current PIN is required")
				.regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
			new: z
				.string()
				.min(1, "New PIN is required")
				.regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
			confirm: z.string().min(1, "Please confirm your PIN"),
		})
		.refine((data) => data.new === data.confirm, {
			message: "PINs don't match",
			path: ["pin", "confirm"],
		}),
});

export type ProfileForm = z.infer<typeof profileSchema>;
export type SectionKey = "personal" | "preferences" | "profilePicture" | "pin";

export interface SectionState {
	isSaving: boolean;
	isSaved: boolean;
	error?: string;
}

// Custom hook for section management
export const useSectionState = (
	sectionKey: SectionKey,
	form: UseFormReturn<ProfileForm>,
	originalValues: ProfileForm,
) => {
	const [state, setState] = useState<SectionState>({
		isSaving: false,
		isSaved: false,
	});
	const [hasChangesState, setHasChangesState] = useState(false);

	// Check for changes only when form values change (not on every keystroke)
	useEffect(() => {
		const subscription = form.watch(
			(_value: unknown, { name }: { name?: string }) => {
				if (!name) return; // Skip if no specific field changed

				// Only check for changes in this section
				if (sectionKey === "pin" && name.startsWith("pin.")) {
					const pinValues = form.getValues("pin");
					const hasPinChanges = Boolean(
						pinValues.current || pinValues.new || pinValues.confirm,
					);
					setHasChangesState(hasPinChanges);
				} else if (sectionKey === "personal" && name.startsWith("personal.")) {
					const personalValues = form.getValues("personal");
					const original = originalValues.personal;
					const hasPersonalChanges =
						personalValues.firstName !== original.firstName ||
						personalValues.lastName !== original.lastName ||
						personalValues.bio !== original.bio;
					setHasChangesState(hasPersonalChanges);
				} else if (
					sectionKey === "preferences" &&
					name.startsWith("preferences.")
				) {
					const prefValues = form.getValues("preferences");
					const original = originalValues.preferences;
					const hasPrefChanges =
						JSON.stringify(prefValues) !== JSON.stringify(original);
					setHasChangesState(hasPrefChanges);
				} else if (
					sectionKey === "profilePicture" &&
					name === "profilePicture"
				) {
					const picValue = form.getValues("profilePicture");
					const hasPicChanges = picValue !== originalValues.profilePicture;
					setHasChangesState(hasPicChanges);
				}
			},
		);

		return () => subscription.unsubscribe();
	}, [form, sectionKey, originalValues]);

	// Reset saved state when changes occur
	useEffect(() => {
		if (hasChangesState && state.isSaved) {
			setState((prev) => ({ ...prev, isSaved: false, error: undefined }));
		}
	}, [hasChangesState, state.isSaved]);

	const save = useCallback(async () => {
		setState({ isSaving: true, isSaved: false, error: undefined });

		try {
			// Simulate API call - replace with actual API
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (sectionKey === "pin") {
				form.setValue("pin", { current: "", new: "", confirm: "" });
			}

			// Reset change state after successful save
			setHasChangesState(false);
			setState({ isSaving: false, isSaved: true });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An error occurred";
			setState({ isSaving: false, isSaved: false, error: errorMessage });
		}
	}, [sectionKey, form]);

	return { state, hasChanges: hasChangesState, save };
};
