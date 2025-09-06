import React from "react";
import { AlertBlock } from "../../AlertBlock";
import { renderInline } from "../renderInline";
import { mergeClassNames } from "../utils";

export const ItmdAlertBlock: React.FC<{
	node: any;
	commonDataProps: any;
	getLineStart: (n: any) => number | undefined;
	getLineEnd: (n: any) => number | undefined;
	getNodeDateAttr: (n: any) => string | undefined;
	renderBlock: (n: any, i: number) => React.ReactNode;
}> = ({
	node,
	commonDataProps,
	getLineStart,
	getLineEnd,
	getNodeDateAttr,
	renderBlock,
}) => {
	const rawVariant = (node as any)?.variant as string | undefined;
	const v = typeof rawVariant === "string" ? rawVariant.toLowerCase() : "";
	const allowedVariants = new Set([
		"note",
		"tip",
		"important",
		"warning",
		"caution",
	]);
	const variant = allowedVariants.has(v) ? v : "info";
	const title = (node as any)?.title as string | undefined;
	const inlineTitle = (node as any)?.inlineTitle as any[] | undefined;
	const children = (node as any)?.children as any[] | undefined;

	const titleEl = title ? <span>{title}</span> : undefined;
	const subtitleEl = inlineTitle ? <>{renderInline(inlineTitle)}</> : undefined;

	const contentEls =
		children?.map((c: any, ci: number) => {
			const cStart = getLineStart(c);
			const cEnd = getLineEnd(c);
			const cDate = getNodeDateAttr(c);
			const key = `alert-c-${cStart ?? ci}`;
			if (c.type === "paragraph") {
				const childDataProps: any = {
					...commonDataProps,
					"data-itin-line-start": cStart ? String(cStart) : undefined,
					"data-itin-line-end": cEnd ? String(cEnd) : undefined,
					"data-itmd-date": cDate,
				};
				return (
					<p key={key} {...childDataProps}>
						{renderInline(c.children || [])}
					</p>
				);
			}
			return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
		}) || [];

	const { className: extraClass, ...rest } = commonDataProps || {};
	const mergedClassName = mergeClassNames(
		"contents",
		extraClass as string | undefined,
	);
	return (
		<div className={mergedClassName} {...rest}>
			<AlertBlock variant={variant} title={titleEl} subtitle={subtitleEl}>
				{contentEls}
			</AlertBlock>
		</div>
	);
};
