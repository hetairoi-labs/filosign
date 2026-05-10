import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/src/lib/components/ui/select";
import { cn } from "@/src/lib/utils/utils";

export type FieldPlacementSignerOption = {
	walletAddress: string;
	name: string;
	email: string;
	/** Single-line label for the select (name + email). */
	label: string;
};

export type FieldPlacementConfirmPayload = {
	assignedSignerWallet: string;
	assignedSignerName: string;
	assignedSignerEmail: string;
	/** When true, field is required; when false, optional. */
	required: boolean;
};

type FieldPlacementDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fieldTypeLabel: string;
	signers: FieldPlacementSignerOption[];
	onConfirm: (payload: FieldPlacementConfirmPayload) => void;
};

export function FieldPlacementDialog({
	open,
	onOpenChange,
	fieldTypeLabel,
	signers,
	onConfirm,
}: FieldPlacementDialogProps) {
	const firstWallet = signers[0]?.walletAddress ?? "";
	const [selectedWallet, setSelectedWallet] = useState(firstWallet);
	const [required, setRequired] = useState(true);

	const normalizedOptions = useMemo(
		() =>
			signers.map((s) => ({
				...s,
				normalized: getAddress(s.walletAddress),
			})),
		[signers],
	);

	const selectedSignerLabel = useMemo(() => {
		if (!selectedWallet) return null;
		try {
			const key = getAddress(selectedWallet);
			return normalizedOptions.find((o) => o.normalized === key)?.label ?? null;
		} catch {
			return null;
		}
	}, [selectedWallet, normalizedOptions]);

	useEffect(() => {
		if (!open) return;
		const initial = signers[0]?.walletAddress
			? getAddress(signers[0].walletAddress)
			: "";
		setSelectedWallet(initial);
		setRequired(true);
	}, [open, signers]);

	const handleConfirm = () => {
		if (!selectedWallet) return;
		const normalized = getAddress(selectedWallet);
		const picked = normalizedOptions.find((s) => s.normalized === normalized);
		onConfirm({
			assignedSignerWallet: normalized,
			assignedSignerName: picked?.name?.trim() || "Signer",
			assignedSignerEmail: picked?.email?.trim() || "",
			required,
		});
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Configure field</DialogTitle>
					<DialogDescription>
						Choose who must complete this <strong>{fieldTypeLabel}</strong>{" "}
						field and whether it is required before signing.
					</DialogDescription>
				</DialogHeader>

				{signers.length === 0 ? (
					<p className="text-sm text-destructive">
						Add at least one signer to the envelope before placing fields.
					</p>
				) : (
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="field-placement-signer">Assigned signer</Label>
							<Select
								value={selectedWallet}
								onValueChange={(v) => {
									if (v != null) setSelectedWallet(v);
								}}
							>
								<SelectTrigger
									id="field-placement-signer"
									className="h-auto min-h-9 w-full border-border/60 bg-muted/5 py-2 whitespace-normal"
								>
									<span
										className={cn(
											"line-clamp-2 min-w-0 flex-1 text-left text-sm wrap-break-word",
											!selectedSignerLabel && "text-muted-foreground",
										)}
									>
										{selectedSignerLabel ?? "Select signer"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{normalizedOptions.map((s) => (
										<SelectItem key={s.normalized} value={s.normalized}>
											<span className="flex min-w-0 flex-col gap-0.5 text-left">
												<span className="truncate font-medium">{s.name}</span>
												{s.email ? (
													<span className="truncate text-xs text-muted-foreground">
														{s.email}
													</span>
												) : null}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<label
							htmlFor="field-placement-required"
							className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-muted/5 p-3 text-sm"
						>
							<Checkbox
								id="field-placement-required"
								checked={required}
								onCheckedChange={(v) => setRequired(v === true)}
								className="mt-0.5"
							/>
							<span>
								<span className="font-medium text-foreground">
									Required field
								</span>
								<span className="mt-0.5 block text-xs text-muted-foreground">
									When unchecked, the signer may skip this field when signing.
								</span>
							</span>
						</label>
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={signers.length === 0 || !selectedWallet}
						onClick={handleConfirm}
					>
						Place field
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
