import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/lib/utils";

interface OtpInputProps {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	className?: string;
	disabled?: boolean;
	autoFocus?: boolean;
	onSubmit?: () => void;
}

export default function OtpInput({
	value,
	onChange,
	length = 6,
	className,
	disabled = false,
	autoFocus = false,
	onSubmit,
}: OtpInputProps) {
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	// Initialize refs array
	useEffect(() => {
		inputRefs.current = inputRefs.current.slice(0, length);
	}, [length]);

	// Auto-focus first input
	useEffect(() => {
		if (autoFocus && inputRefs.current[0]) {
			inputRefs.current[0]?.focus();
		}
	}, [autoFocus]);

	// Re-focus first input when value is reset (becomes empty)
	useEffect(() => {
		if (autoFocus && value === "" && inputRefs.current[0]) {
			inputRefs.current[0]?.focus();
		}
	}, [value, autoFocus]);

	const handleInputChange = (index: number, inputValue: string) => {
		// Only allow digits
		const digit = inputValue.replace(/\D/g, "");

		if (digit.length > 1) return; // Prevent multiple digits

		// Update the value
		const newValue = value.split("");
		newValue[index] = digit;
		const finalValue = newValue.join("").slice(0, length);
		onChange(finalValue);

		// Auto-focus next input
		if (digit && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Backspace") {
			if (!value[index] && index > 0) {
				// If current input is empty, move to previous and clear it
				const newValue = value.split("");
				newValue[index - 1] = "";
				onChange(newValue.join(""));
				inputRefs.current[index - 1]?.focus();
			} else {
				// Clear current input
				const newValue = value.split("");
				newValue[index] = "";
				onChange(newValue.join(""));
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			inputRefs.current[index - 1]?.focus();
		} else if (e.key === "ArrowRight" && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		} else if (e.key === "Enter" && onSubmit && value.length === length) {
			e.preventDefault();
			onSubmit();
		}
	};

	const handleFocus = (index: number) => {
		setFocusedIndex(index);
		// Move cursor to end when focusing
		setTimeout(() => {
			inputRefs.current[index]?.setSelectionRange(1, 1);
		}, 0);
	};

	const handleBlur = () => {
		setFocusedIndex(null);
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const paste = e.clipboardData
			.getData("text")
			.replace(/\D/g, "")
			.slice(0, length);
		onChange(paste);
	};

	return (
		<div className={cn("flex gap-2 justify-center", className)}>
			{Array.from({ length }, (_, index) => (
				<input
					key={index}
					ref={(el) => {
						inputRefs.current[index] = el;
					}}
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					autoComplete="one-time-code"
					name={`otp-${index}`}
					value={value[index] || ""}
					onChange={(e) => handleInputChange(index, e.target.value)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onFocus={() => handleFocus(index)}
					onBlur={handleBlur}
					onPaste={handlePaste}
					disabled={disabled}
					className={cn(
						"w-12 h-12 text-center text-xl font-mono border-2 rounded-lg transition-all duration-200",
						"bg-background text-foreground placeholder:text-muted-foreground",
						"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
						focusedIndex === index
							? "border-primary ring-2 ring-primary/20"
							: "border-border hover:border-border/80",
						value[index] && "border-primary bg-primary/5",
						disabled && "opacity-50 cursor-not-allowed",
					)}
					maxLength={1}
				/>
			))}
		</div>
	);
}
