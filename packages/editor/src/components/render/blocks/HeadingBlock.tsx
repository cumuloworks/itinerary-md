import { toString as mdastToString } from "mdast-util-to-string";
import type React from "react";
import type { MdNode } from "../types";

export const HeadingBlock: React.FC<{
	node: MdNode;
	commonDataProps: any;
}> = ({ node, commonDataProps }) => {
	const depth = (node as { depth?: number }).depth || 1;
	const text = (() => {
		try {
			return mdastToString(node as any).trim();
		} catch {
			return "";
		}
	})();
	if (!text) return null;
	const dataProps: any = { ...commonDataProps };
	const hClass = (() => {
		switch (depth) {
			case 1:
				return "text-4xl font-bold text-gray-900 mb-6 mt-6 ml-0";
			case 2:
				return "text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6 ml-0";
			case 3:
				return "text-lg font-semibold text-gray-800 mb-3 mt-6 ml-0";
			case 4:
				return "text-base font-semibold text-gray-800 mb-2 mt-4 ml-0";
			case 5:
				return "text-sm font-semibold text-gray-800 mb-2 mt-4 ml-0";
			default:
				return "text-xs font-semibold text-gray-800 mb-2 mt-4 ml-0";
		}
	})();
	switch (depth) {
		case 1:
			return (
				<h1 className={hClass} {...dataProps}>
					{text}
				</h1>
			);
		case 2:
			return (
				<h2 className={hClass} {...dataProps}>
					{text}
				</h2>
			);
		case 3:
			return (
				<h3 className={hClass} {...dataProps}>
					{text}
				</h3>
			);
		case 4:
			return (
				<h4 className={hClass} {...dataProps}>
					{text}
				</h4>
			);
		case 5:
			return (
				<h5 className={hClass} {...dataProps}>
					{text}
				</h5>
			);
		default:
			return (
				<h6 className={hClass} {...dataProps}>
					{text}
				</h6>
			);
	}
};
