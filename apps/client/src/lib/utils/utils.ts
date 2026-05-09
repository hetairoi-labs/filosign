import { type ClassValue, clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function truncateText(text: string, length: number = 20) {
	if (text.length <= length) return text;
	return `${text.slice(0, length)}...`;
}

export function truncateAddress(address: string | undefined) {
	if (!address) return "";
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
	toast.success("Copied to clipboard");
}
