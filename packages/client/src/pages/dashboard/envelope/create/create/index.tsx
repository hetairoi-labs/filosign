import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { UserDropdown } from "../../../_components/user-dropdown";
import type { EnvelopeForm, StoredDocument } from "../types";
import DocumentsSection from "./_components/DocumentUpload";
import RecipientsSection from "./_components/RecipientsSection";

export default function CreateEnvelopePage() {
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();

	const form = useForm({
		defaultValues: {
			recipients: [],
			emailMessage: "",
			emailSubject: "",
			documents: [],
		} as EnvelopeForm,
		onSubmit: async ({ value }) => {
			// Validate documents
			if (!value.documents || value.documents.length === 0) {
				toast.error("Please upload at least one document");
				return;
			}

			// Validate recipients
			if (!value.recipients || value.recipients.length === 0) {
				toast.error("Please add at least one recipient");
				return;
			}

			// Validate recipient wallet addresses
			const invalidRecipients = value.recipients.filter(
				(r) => !r.walletAddress || r.walletAddress.trim() === "",
			);
			if (invalidRecipients.length > 0) {
				toast.error("All recipients must have a wallet address");
				return;
			}

			try {
				// Convert files to data URLs for storage
				const storedDocuments: StoredDocument[] = await Promise.all(
					value.documents.map(async (doc) => {
						const dataUrl = await new Promise<string>((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = reject;
							reader.readAsDataURL(doc.file);
						});

						return {
							id: doc.id,
							name: doc.name,
							size: doc.size,
							type: doc.type,
							dataUrl,
						};
					}),
				);

				// Store form data in persistent store
				const createFormData = {
					recipients: value.recipients,
					emailMessage: value.emailMessage,
					emailSubject: "",
					documents: storedDocuments,
				};

				setCreateForm(createFormData);

				// Navigate to add-sign page
				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
				toast.error("Failed to prepare documents. Please try again.", {
					id: "prepare-progress",
				});
			}
		},
	});

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<h3>Create New Document</h3>
				</div>

				<UserDropdown />
			</header>

			{/* Main Content */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<main className="p-8 mx-auto space-y-8 max-w-4xl">
					<form.Field
						name="documents"
						validators={{
							onChange: ({ value }) => {
								if (!value || value.length === 0) {
									return "Please upload at least one document";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<DocumentsSection
								documents={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								error={field.state.meta.errors?.[0]}
								isTouched={field.state.meta.isTouched}
							/>
						)}
					</form.Field>

					<form.Field
						name="recipients"
						validators={{
							onChange: ({ value }) => {
								if (!value || value.length === 0) {
									return "Please add at least one recipient";
								}
								// Check all recipients have wallet addresses
								const invalid = value.filter(
									(r) => !r.walletAddress || r.walletAddress.trim() === "",
								);
								if (invalid.length > 0) {
									return "All recipients must have a wallet address";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<RecipientsSection
								recipients={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								error={field.state.meta.errors?.[0]}
								isTouched={field.state.meta.isTouched}
							/>
						)}
					</form.Field>
				</main>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 25,
						delay: 0.7,
					}}
					className="flex justify-end px-8 mb-8 mx-auto max-w-4xl gap-4"
				>
					<Button
						type="button"
						variant="ghost"
						size="lg"
						className="gap-2"
						asChild
					>
						<Link to="/dashboard">Back</Link>
					</Button>
					<Button
						type="submit"
						variant="primary"
						size="lg"
						className="gap-2 group transition-all duration-200"
						disabled={form.state.isSubmitting}
					>
						{form.state.isSubmitting ? "Submitting..." : "Next Step"}
					</Button>
				</motion.div>
			</form>
		</div>
	);
}
