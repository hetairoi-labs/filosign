import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { Form } from "@/src/lib/components/ui/form";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import type { EnvelopeForm, StoredDocument } from "../types";
import DocumentsSection from "./_components/DocumentUpload";
import RecipientsSection from "./_components/RecipientsSection";

export default function CreateEnvelopePage() {
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();

	const form = useForm<EnvelopeForm>({
		defaultValues: {
			recipients: [],
			emailMessage: "",
			documents: [],
		},
	});

	const {
		fields: documentFields,
		append: appendDocument,
		remove: removeDocument,
	} = useFieldArray({
		control: form.control,
		name: "documents",
	});

	const {
		fields: recipientFields,
		append: appendRecipient,
		remove: removeRecipient,
	} = useFieldArray({
		control: form.control,
		name: "recipients",
	});

	const onSubmit = async (data: EnvelopeForm) => {
		if (!data.documents || data.documents.length === 0) {
			toast.error("Please upload at least one document");
			return;
		}

		if (!data.recipients || data.recipients.length === 0) {
			toast.error("Please add at least one recipient");
			return;
		}

		// Validate all recipients have wallet addresses
		const invalidRecipients = data.recipients.filter(
			(r) => !r.walletAddress || r.walletAddress.trim() === "",
		);
		if (invalidRecipients.length > 0) {
			toast.error("All recipients must have a wallet address");
			return;
		}

		try {
			// Convert files to data URLs for storage
			const storedDocuments: StoredDocument[] = await Promise.all(
				data.documents.map(async (doc) => {
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
				recipients: data.recipients,
				emailMessage: data.emailMessage,
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
	};

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
			</header>

			{/* Main Content */}
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<main className="p-8 mx-auto space-y-8 max-w-4xl">
						<DocumentsSection
							control={form.control}
							fields={documentFields}
							append={appendDocument}
							remove={removeDocument}
						/>
						<RecipientsSection
							control={form.control}
							fields={recipientFields}
							append={appendRecipient}
							remove={removeRecipient}
						/>
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
						>
							Next Step
						</Button>
					</motion.div>
				</form>
			</Form>
		</div>
	);
}
