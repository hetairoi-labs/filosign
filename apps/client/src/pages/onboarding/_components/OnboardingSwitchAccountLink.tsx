import { useFilosignContext } from "@filosign/react";
import { useLogout } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils";
import { logger } from "@/src/lib/utils/logger";
import { safeAsync } from "@/src/lib/utils/safe";

export function OnboardingSwitchAccountLink({
	className,
}: {
	className?: string;
}) {
	const { wallet } = useFilosignContext();
	const { logout: logoutPrivy } = usePrivy();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);

	const handleClick = async () => {
		setPending(true);
		try {
			clearOnboardingForm();
			if (wallet) {
				const [, err] = await safeAsync(() => logoutFilosign.mutateAsync());
				if (err) {
					logger.error("Filosign logout before switch account:", err);
				}
			}
			const [, privyErr] = await safeAsync(() => logoutPrivy());
			if (privyErr) {
				logger.error("Privy logout (switch account):", privyErr);
			}
			await navigate({ to: "/" });
		} finally {
			setPending(false);
		}
	};

	return (
		<div className={cn("flex mt-2 w-full justify-center pt-2", className)}>
			<Button
				type="button"
				variant="link"
				className="text-muted-foreground h-auto min-h-0 px-2 py-1 text-sm"
				disabled={pending}
				onClick={() => void handleClick()}
			>
				{pending ? "Switching…" : "Switch account"}
			</Button>
		</div>
	);
}
