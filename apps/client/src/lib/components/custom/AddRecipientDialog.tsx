import { useRequestApproval } from "@filosign/react/hooks";
import {
	CheckCircleIcon,
	EnvelopeIcon,
	PlusIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { safeAsync } from "@/src/lib/utils/safe";

interface AddRecipientDialogProps {
	trigger?: React.ReactElement;
	onSuccess?: () => void;
}

type Step = "email" | "success";

export default function AddRecipientDialog({
	trigger,
	onSuccess,
}: AddRecipientDialogProps) {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [step, setStep] = useState<Step>("email");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [result, setResult] = useState<{
		exists?: boolean;
		requested?: boolean;
		invited?: boolean;
		alreadyRequested?: boolean;
		alreadyApproved?: boolean;
		alreadyInvited?: boolean;
	} | null>(null);

	const sendShareRequest = useRequestApproval();
	const navigate = useNavigate();

	const isValidEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSubmit = async () => {
		if (!isValidEmail(email.trim())) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsSubmitting(true);

		// Single API call handles both cases
		const [data, error] = await safeAsync(
			sendShareRequest.mutateAsync({
				recipientEmail: email.trim(),
				message: message.trim() || undefined,
			}),
		);

		setIsSubmitting(false);

		if (error) {
			toast.error(error.message || "Something went wrong");
			return;
		}

		setResult(data || {});
		setStep("success");
	};

	const handleClose = () => {
		setOpen(false);
		setTimeout(() => {
			setStep("email");
			setEmail("");
			setMessage("");
			setResult(null);
		}, 200);
		onSuccess?.();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={trigger || <Button variant="primary" />}>
				{!trigger && (
					<>
						<PlusIcon className="w-4 h-4" />
						Add Recipient
					</>
				)}
			</DialogTrigger>

			<DialogContent className="sm:max-w-[425px]">
				{step === "email" && (
					<>
						<DialogHeader>
							<DialogTitle>Add Recipient</DialogTitle>
							<DialogDescription>
								Enter their email address. We&apos;ll handle the rest - connect
								if they&apos;re on Filosign, or invite them to join.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="email" className="flex items-center gap-2">
									<EnvelopeIcon className="w-4 h-4" />
									Email Address
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="name@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !isSubmitting) {
											handleSubmit();
										}
									}}
									autoFocus
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="message">Message (Optional)</Label>
								<Textarea
									id="message"
									placeholder="Hey, I want to send you some documents on Filosign..."
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									rows={3}
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!isValidEmail(email.trim()) || isSubmitting}
								variant="primary"
							>
								{isSubmitting ? (
									<>
										<SpinnerGapIcon className="w-4 h-4 animate-spin" />
										Sending...
									</>
								) : (
									"Send Request"
								)}
							</Button>
						</div>
					</>
				)}

				{step === "success" && result && (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<CheckCircleIcon className="w-6 h-6 text-green-500" />
								{result.alreadyApproved
									? "Already Connected"
									: result.alreadyRequested
										? "Request Pending"
										: result.alreadyInvited
											? "Already Invited"
											: result.exists
												? "Request Sent"
												: "Invite Sent"}
							</DialogTitle>
						</DialogHeader>

						<div className="py-2 space-y-4">
							{/* Already connected */}
							{result.alreadyApproved && (
								<div className="text-center space-y-2">
									<p className="text-muted-foreground">
										You&apos;re already connected with <strong>{email}</strong>.
									</p>
									<p className="text-sm text-muted-foreground">
										You can send them documents right away.
									</p>
								</div>
							)}

							{/* Request already pending */}
							{result.alreadyRequested && (
								<div className="text-center space-y-2">
									<p className="text-muted-foreground">
										You&apos;ve already sent a request to{" "}
										<strong>{email}</strong>.
									</p>
									<p className="text-sm text-muted-foreground">
										Waiting for them to accept.
									</p>
								</div>
							)}

							{/* Already invited */}
							{result.alreadyInvited && (
								<div className="text-center space-y-2">
									<p className="text-muted-foreground">
										You&apos;ve already invited <strong>{email}</strong>.
									</p>
									<p className="text-sm text-muted-foreground">
										They&apos;ll receive your invitation email.
									</p>
								</div>
							)}

							{/* User exists - request sent */}
							{result.exists && result.requested && (
								<div className="text-center space-y-2">
									<p className="text-muted-foreground">
										<strong>{email}</strong> is on Filosign!
									</p>
									<p className="text-sm text-muted-foreground">
										They&apos;ll receive a notification to accept your
										connection request.
									</p>
								</div>
							)}

							{/* User doesn't exist - invite sent */}
							{result.invited && !result.alreadyInvited && (
								<div className="text-center space-y-2">
									<p className="text-muted-foreground">
										<strong>{email}</strong> invited!
									</p>
									<p className="text-sm text-muted-foreground">
										They&apos;ll receive an email invitation. Once they join,
										you can send them documents.
									</p>
								</div>
							)}

							{message && (
								<div className="bg-muted/30 p-3 rounded-lg">
									<p className="text-xs text-muted-foreground mb-1">
										Your message:
									</p>
									<p className="text-sm italic">&quot;{message}&quot;</p>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-3">
							{(result.requested ||
								result.invited ||
								result.alreadyInvited) && (
								<Button
									onClick={() => {
										handleClose();
										navigate({ to: "/dashboard" });
									}}
									variant="outline"
								>
									Back to Dashboard
								</Button>
							)}
							<Button onClick={handleClose} variant="primary">
								{result.alreadyApproved ? "Close" : "Done"}
							</Button>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
