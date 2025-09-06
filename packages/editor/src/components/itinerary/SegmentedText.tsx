import type React from "react";
import { renderInline } from "../render/renderInline";

export type TextSegment = {
	text: string;
	url?: string;
	kind?: "text" | "code";
};

interface SegmentedTextProps {
	segments?: TextSegment[];
	fallbackText?: string;
	className?: string;
	linkClassName?: string;
}

export const SegmentedText: React.FC<SegmentedTextProps> = ({
	segments,
	fallbackText,
	className = "",
	linkClassName = "underline text-inherit",
}) => {
	if (!segments || segments.length === 0) {
		if (!fallbackText) return null;
		return <span className={className}>{fallbackText}</span>;
	}

	const nodes = segments.map((seg) => {
		if (seg.kind === "code") {
			return { type: "inlineCode", value: seg.text } as const;
		}
		if (seg.url) {
			return {
				type: "link",
				url: seg.url,
				children: [{ type: "text", value: seg.text }],
			} as const;
		}
		return { type: "text", value: seg.text } as const;
	});

	return (
		<span className={className}>
			{renderInline(nodes as any[], { linkClassName })}
		</span>
	);
};
