import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react";
import { Badge } from "../../../lib/components/ui/badge";

interface StatusBadgeProps {
	status: boolean | undefined;
	label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
	if (status === undefined)
		return (
			<Badge variant="outline">
				<ClockIcon className="w-3 h-3 mr-1" />
				Loading
			</Badge>
		);
	return (
		<Badge variant={status ? "default" : "secondary"}>
			{status ? (
				<CheckCircleIcon className="w-3 h-3 mr-1" />
			) : (
				<XCircleIcon className="w-3 h-3 mr-1" />
			)}
			{label}
		</Badge>
	);
}
