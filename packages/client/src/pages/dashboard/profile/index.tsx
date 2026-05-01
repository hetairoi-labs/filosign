import { useUserProfile } from "@filosign/react/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { Form } from "@/src/lib/components/ui/form";
import { useFileUpload } from "./hooks/use-file-upload";
import { useSectionState } from "./hooks/use-section-state";
import { PersonalInfoSection } from "./PersonalInfoSection";
import type { ProfileForm } from "./types";
import { profileSchema } from "./types";

export default function ProfilePage() {
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
	const _profilePictureSection = useSectionState(
		"profilePicture",
		form,
		baseValues,
	);
	useFileUpload(form);

	useLinkAccount();

	type LinkedAccount = {
		type?: string;
		address?: string;
		walletAddress?: string;
		subject?: string;
	};

	const _linkedAccounts = ((user as { linkedAccounts?: LinkedAccount[] } | null)
		?.linkedAccounts ?? []) as LinkedAccount[];

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<motion.h3
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.1,
						}}
					>
						Profile Settings
					</motion.h3>
				</div>
			</header>

			{/* Main Content */}
			<Form {...form}>
				<form>
					<main className="p-8 mx-auto max-w-4xl space-y-8 flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)]">
						<Button
							variant="ghost"
							size="lg"
							className="self-start mb-4"
							asChild
						>
							<Link to="/dashboard">
								<CaretLeftIcon className="size-5" weight="bold" />
								<p>Back</p>
							</Link>
						</Button>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.2,
							}}
							className="space-y-8 w-full"
						>
							{/* Profile Picture Section */}
							{/* <ProfilePictureSection
								form={form}
								sectionState={profilePictureSection}
								uploadFile={uploadFile}
								uploadError={uploadError}
							/> */}

							{/* Personal Information */}
							<PersonalInfoSection form={form} sectionState={personalSection} />
							{/* Privy linked accounts */}
						</motion.div>
					</main>
				</form>
			</Form>
		</div>
	);
}
