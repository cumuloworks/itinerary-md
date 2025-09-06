import React from "react";
import { renderInline } from "../renderInline";
import type { MdNode } from "../types";

export const BlockquoteBlock: React.FC<{
	node: MdNode;
	commonDataProps: any;
	getLineStart: (n: any) => number | undefined;
	renderBlock: (n: any, i: number) => React.ReactNode;
}> = ({ node, commonDataProps, getLineStart, renderBlock }) => {
	const children = Array.isArray((node as any).children)
		? ((node as any).children as any[])
		: [];
	const baseBq = "my-4 pl-4 border-l-4 border-gray-200 text-gray-500 ml-20";
	return (
		<blockquote className={baseBq} {...commonDataProps}>
			{children.map((c: any, ci: number) => {
				const cStart = getLineStart(c);
				const key = `bqc-${cStart ?? ci}`;
				if (c.type === "paragraph") {
					return <p key={key}>{renderInline(c.children || [])}</p>;
				}
				return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
			})}
		</blockquote>
	);
};
