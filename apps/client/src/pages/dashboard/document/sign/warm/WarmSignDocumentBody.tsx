import type { RefObject } from "react";
import type { WarmSignFileContentProps } from "./WarmSignFileContent";
import { WarmSignFileContent } from "./WarmSignFileContent";

export type WarmSignDocumentBodyProps = {
	containerRef: RefObject<HTMLDivElement | null>;
	documentRef: RefObject<HTMLDivElement | null>;
	fileContent: WarmSignFileContentProps;
};

export function WarmSignDocumentBody({
	containerRef,
	documentRef,
	fileContent,
}: WarmSignDocumentBodyProps) {
	return (
		<div ref={containerRef} className="flex-1 h-full overflow-auto">
			<div ref={documentRef} className="relative w-full h-full bg-background">
				<WarmSignFileContent {...fileContent} />
			</div>
		</div>
	);
}
