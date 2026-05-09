import { useRotatePin, useUserProfile } from "@filosign/react/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ProfileForm } from "../types";
import { profileSchema } from "../types";
import { useFileUpload } from "./use-file-upload";
import { useSectionState } from "./use-section-state";

export function useProfileSettings() {
	const { user } = usePrivy();
	const walletAddress = user?.wallet?.address || "";
	const userProfileQuery = useUserProfile();

	const form = useForm<ProfileForm>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			personal: {
				firstName: "",
				lastName: "",
				walletAddress,
				email: "",
			},
			profilePicture: null,
		},
		mode: "onSubmit",
	});

	const baseValues = useMemo(() => {
		const userProfile = userProfileQuery.data as
			| {
					firstName?: string | null;
					lastName?: string | null;
					email?: string | null;
					avatarUrl?: string | null;
			  }
			| undefined;
		return {
			personal: {
				firstName: userProfile?.firstName ?? "",
				lastName: userProfile?.lastName ?? "",
				walletAddress,
				email: userProfile?.email ?? "",
			},
			profilePicture: userProfile?.avatarUrl ?? null,
		};
	}, [userProfileQuery.data, walletAddress]);

	useEffect(() => {
		if (!userProfileQuery.data) return;
		form.reset(baseValues);
	}, [form, baseValues, userProfileQuery.data]);

	const personalSection = useSectionState("personal", form, baseValues);
	const profilePictureSection = useSectionState(
		"profilePicture",
		form,
		baseValues,
	);
	const fileUpload = useFileUpload(form);

	const rotatePin = useRotatePin();
	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinMessage, setPinMessage] = useState<string | null>(null);

	useLinkAccount();

	const canRotatePin =
		currentPin.length >= 6 &&
		currentPin.length <= 10 &&
		newPin.length >= 6 &&
		newPin.length <= 10 &&
		newPin === confirmPin;

	return {
		form,
		personalSection,
		profilePictureSection,
		fileUpload,
		rotatePin,
		currentPin,
		newPin,
		confirmPin,
		pinMessage,
		setCurrentPin,
		setNewPin,
		setConfirmPin,
		setPinMessage,
		canRotatePin,
	};
}
