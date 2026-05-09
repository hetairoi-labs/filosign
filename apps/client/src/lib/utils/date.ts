import {
	differenceInCalendarDays,
	endOfDay,
	format,
	formatDistanceToNow,
	isBefore,
	isToday as isTodayDate,
	isTomorrow as isTomorrowDate,
	startOfDay,
} from "date-fns";

function toDate(date: string | Date) {
	return date instanceof Date ? date : new Date(date);
}

// Format date for display
export function formatDate(
	date: string | Date,
	pattern = "MMM d, yyyy",
): string {
	return format(toDate(date), pattern);
}

// Format date with time
export function formatDateTime(
	date: string | Date,
	pattern = "MMM d, yyyy 'at' h:mm a",
): string {
	return format(toDate(date), pattern);
}

// Get relative time (e.g., "2 hours ago", "in 3 days")
export function getRelativeTime(date: string | Date): string {
	return formatDistanceToNow(toDate(date), { addSuffix: true });
}

// Check if date is overdue
export function isOverdue(date: string | Date): boolean {
	return isBefore(toDate(date), new Date());
}

// Check if date is today
export function isToday(date: string | Date): boolean {
	return isTodayDate(toDate(date));
}

// Check if date is tomorrow
export function isTomorrow(date: string | Date): boolean {
	return isTomorrowDate(toDate(date));
}

// Get smart date display (Today, Tomorrow, or formatted date)
export function getSmartDateDisplay(date: string | Date): string {
	const currentDate = toDate(date);
	const now = new Date();

	if (isTodayDate(currentDate)) {
		return `Today at ${format(currentDate, "h:mm a")}`;
	}

	if (isTomorrowDate(currentDate)) {
		return `Tomorrow at ${format(currentDate, "h:mm a")}`;
	}

	if (Math.abs(differenceInCalendarDays(currentDate, now)) <= 7) {
		return format(currentDate, "EEEE 'at' h:mm a");
	}

	return format(currentDate, "MMM d, yyyy 'at' h:mm a");
}

// Create date at end of day (23:59:59)
export function createEndOfDay(date?: string | Date): Date {
	return endOfDay(toDate(date ?? new Date()));
}

// Create date at start of day (00:00:00)
export function createStartOfDay(date?: string | Date): Date {
	return startOfDay(toDate(date ?? new Date()));
}
