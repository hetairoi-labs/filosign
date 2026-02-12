import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	CalendarIcon,
	CheckSquareIcon,
	EnvelopeIcon,
	FileIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	PrinterIcon,
	SignatureIcon,
	TextAaIcon,
	TextBIcon,
	UserIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/src/lib/components/custom/Image";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import type { Document, SignatureField } from "../mock";

export const useDocumentDimensions = () => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return {
		width: isMobile ? 300 : 600,
		height: isMobile ? 400 : 800,
		margin: 0,
		isMobile,
	};
};

interface DocumentViewerProps {
	document: Document | null;
	zoom: number;
	signatureFields: SignatureField[];
	selectedField: string | null;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onFieldPlaced: (x: number, y: number) => void;
	onFieldSelect: (fieldId: string) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onZoomChange: (zoom: number) => void;
	onBack: () => void;
}

export default function DocumentViewer({
	document,
	zoom,
	signatureFields,
	selectedField,
	isPlacingField,
	pendingFieldType,
	onFieldPlaced,
	onFieldSelect,
	onFieldRemove,
	onFieldUpdate,
	onZoomChange,
	onBack,
}: DocumentViewerProps) {
	const [isDragging, setIsDragging] = useState(false);
	const {
		width: documentWidth,
		height: documentHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);
	const dragDataRef = useRef({
		startX: 0,
		startY: 0,
		fieldX: 0,
		fieldY: 0,
		fieldId: "",
	});
	const lastUpdateRef = useRef(0);

	const handleDocumentClick = useCallback(
		(event: React.MouseEvent) => {
			if (!isPlacingField) return;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const x = (event.clientX - documentRect.left) / (zoom / 100);
			const y = (event.clientY - documentRect.top) / (zoom / 100);

			// Use responsive dimensions

			const boundedX = Math.max(margin, Math.min(x, documentWidth - margin));
			const boundedY = Math.max(margin, Math.min(y, documentHeight - margin));

			onFieldPlaced(boundedX, boundedY);
		},
		[
			isPlacingField,
			onFieldPlaced,
			zoom,
			documentWidth,
			documentHeight,
			margin,
		],
	);

	const handleFieldClick = (fieldId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		onFieldSelect(fieldId);
	};

	const handleFieldMouseDown = (fieldId: string, event: React.MouseEvent) => {
		event.stopPropagation();

		const field = signatureFields.find((f) => f.id === fieldId);
		if (!field) return;

		// Store drag data in ref for immediate access
		dragDataRef.current = {
			startX: event.clientX,
			startY: event.clientY,
			fieldX: field.x,
			fieldY: field.y,
			fieldId: fieldId,
		};

		setIsDragging(true);
		onFieldSelect(fieldId);
	};

	// Handle mouse move for dragging - optimized with refs and throttling
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging) return;

			const now = performance.now();
			if (now - lastUpdateRef.current < 16) return;
			lastUpdateRef.current = now;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const dragData = dragDataRef.current;
			const deltaX = (event.clientX - dragData.startX) / (zoom / 100);
			const deltaY = (event.clientY - dragData.startY) / (zoom / 100);

			// Use responsive dimensions

			const newX = Math.max(
				margin,
				Math.min(dragData.fieldX + deltaX, documentWidth - margin),
			);
			const newY = Math.max(
				margin,
				Math.min(dragData.fieldY + deltaY, documentHeight - margin),
			);

			onFieldUpdate(dragData.fieldId, { x: newX, y: newY });
		},
		[isDragging, onFieldUpdate, zoom],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		dragDataRef.current = {
			startX: 0,
			startY: 0,
			fieldX: 0,
			fieldY: 0,
			fieldId: "",
		};
	}, []);

	// Add global mouse event listeners when dragging
	useEffect(() => {
		if (isDragging) {
			const handleGlobalMouseMove = (event: MouseEvent) =>
				handleMouseMove(event);
			const handleGlobalMouseUp = () => handleMouseUp();

			window.addEventListener("mousemove", handleGlobalMouseMove);
			window.addEventListener("mouseup", handleGlobalMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleGlobalMouseMove);
				window.removeEventListener("mouseup", handleGlobalMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Local field configuration for icons and labels
	const fieldConfig = {
		signature: { icon: SignatureIcon, label: "Signature" },
		initial: { icon: TextAaIcon, label: "Initial" },
		date: { icon: CalendarIcon, label: "Date Signed" },
		name: { icon: UserIcon, label: "Name" },
		email: { icon: EnvelopeIcon, label: "Email" },
		text: { icon: TextBIcon, label: "Text" },
		checkbox: { icon: CheckSquareIcon, label: "Checkbox" },
	} as const;

	const getFieldIcon = (type: SignatureField["type"]) => {
		const config = fieldConfig[type];
		const IconComponent = config?.icon || FileIcon;
		return (
			<IconComponent
				className={cn(isMobile ? "size-4" : "size-6")}
				weight="fill"
			/>
		);
	};

	const getFieldLabel = (type: SignatureField["type"]) => {
		return fieldConfig[type]?.label || "Field";
	};

	return (
		<div className="flex flex-col flex-1">
			{/* Document Tools */}
			<div className="flex items-center justify-center gap-2 py-4 w-full border-b px-4 z-20">
				<Button variant="ghost" size="sm" onClick={onBack}>
					<ArrowCounterClockwiseIcon className="size-5" />
				</Button>
				<Button variant="ghost" size="sm">
					<ArrowClockwiseIcon className="size-5" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onZoomChange(Math.max(zoom - 25, 50))}
				>
					<MagnifyingGlassMinusIcon className="size-5" />
				</Button>
				<span className="text-sm font-medium min-w-[3rem] text-center">
					{zoom}%
				</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onZoomChange(Math.min(zoom + 25, 200))}
				>
					<MagnifyingGlassPlusIcon className="size-5" />
				</Button>
				<Button variant="ghost" size="sm">
					<PrinterIcon className="size-5" />
				</Button>
			</div>

			{/* Document Container */}
			<div
				ref={containerRef}
				className={cn(
					"overflow-auto bg-muted/10 flex items-start justify-center px-8 py-8 flex-1",
					isPlacingField ? "cursor-crosshair" : "cursor-default",
				)}
			>
				<div
					ref={documentRef}
					className="w-fit bg-white border shadow-lg border-border"
					style={{
						transform: `scale(${zoom / 100})`,
						transformOrigin: "top left",
					}}
				>
					{/* Document Page */}
					<div
						className={cn(`bg-white relative`)}
						style={{
							width: documentWidth,
							height: documentHeight,
						}}
					>
						{/* Render uploaded PDF or image if provided */}
						{document?.url ? (
							document.url.startsWith("data:application/pdf") ||
							document.name?.toLowerCase().endsWith(".pdf") ? (
								<>
									<object
										data={document.url}
										type="application/pdf"
										className="absolute inset-0 w-full h-full z-10"
									>
										<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
											PDF preview not supported in this browser.
										</div>
									</object>
									<div
										className={cn(
											"absolute inset-0 w-full h-full pointer-events-auto",
											isPlacingField
												? "cursor-crosshair bg-blue-500/5 z-20"
												: "cursor-default bg-transparent",
										)}
										onClick={handleDocumentClick}
									/>
									{isPlacingField && (
										<div className="absolute inset-0 border-2 border-dashed border-secondary/50 bg-secondary/20 pointer-events-none">
											<div className="absolute top-2 left-2 text-xs text-primary bg-secondary px-2 py-1 rounded">
												Click to place {pendingFieldType} field
											</div>
										</div>
									)}
								</>
							) : (
								<>
									<Image
										src={document.url}
										alt={document.name}
										className="absolute inset-0 w-full h-full object-contain bg-white z-10"
										draggable={false}
										onClick={handleDocumentClick}
									/>
									<div
										className={cn(
											"absolute inset-0 w-full h-full pointer-events-auto",
											isPlacingField
												? "cursor-crosshair bg-blue-500/5 z-20"
												: "cursor-default bg-transparent",
										)}
										onClick={handleDocumentClick}
									/>
									{isPlacingField && (
										<div className="absolute inset-0 border-2 border-dashed border-secondary/50 bg-secondary/20 pointer-events-none z-20">
											<div className="absolute top-2 left-2 text-xs text-primary bg-secondary px-2 py-1 rounded ">
												Click to place {pendingFieldType} field
											</div>
										</div>
									)}
								</>
							)
						) : (
							<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
								No document preview available
							</div>
						)}

						{/* Signature Fields */}
						{signatureFields.map((field) => {
							// Responsive signature box dimensions
							const fieldWidth = isMobile ? 90 : 130;
							const fieldHeight = isMobile ? 32 : 42;

							const constrainedX = Math.max(
								margin,
								Math.min(field.x, documentWidth - fieldWidth - margin),
							);
							const constrainedY = Math.max(
								margin,
								Math.min(field.y, documentHeight - fieldHeight - margin),
							);

							return (
								<div
									key={field.id}
									className={cn(
										"absolute border-2 border-dashed rounded-md bg-primary/10 hover:bg-primary/10 cursor-move select-none group flex justify-center items-center gap-1.5 z-30",
										isMobile ? "p-1.5" : "p-2",
										selectedField === field.id
											? "border-primary bg-primary/10 shadow-lg "
											: "border-primary/50 hover:border-primary/70 hover:bg-primary/80",
									)}
									style={{
										left: constrainedX,
										top: constrainedY,
									}}
									onClick={(e) => handleFieldClick(field.id, e)}
									onMouseDown={(e) => handleFieldMouseDown(field.id, e)}
								>
									<div
										className={cn(
											"flex items-center",
											isMobile ? "gap-1" : "gap-2",
										)}
									>
										<span className="text-primary">
											{getFieldIcon(field.type)}
										</span>
										<span
											className={cn(
												"font-medium text-primary whitespace-nowrap",
												isMobile ? "text-[10px]" : "text-xs",
											)}
										>
											{getFieldLabel(field.type)}
										</span>
										<button
											type="button"
											className={cn("p-0", isMobile ? "w-3 h-3" : "w-4 h-4")}
											onClick={(e) => {
												e.stopPropagation();
												onFieldRemove(field.id);
											}}
										>
											<XIcon
												className={cn(isMobile ? "w-2.5 h-2.5" : "w-3 h-3")}
											/>
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
