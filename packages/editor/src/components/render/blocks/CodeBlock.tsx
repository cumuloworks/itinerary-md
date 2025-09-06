import hljs from "highlight.js/lib/common";
import { useEffect, useRef } from "react";
import { mergeClassNames } from "../utils";

export const CodeBlock: React.FC<{
	lang?: string;
	value: string;
	dataProps?: Record<string, unknown>;
}> = ({ lang, value, dataProps }) => {
	const codeRef = useRef<HTMLElement | null>(null);
	const codeClass = [lang ? `language-${lang}` : undefined, "hljs"]
		.filter(Boolean)
		.join(" ");

	useEffect(() => {
		const el = codeRef.current;
		if (!el) return;
		try {
			// remove previous language-* classes
			Array.from(el.classList)
				.filter((c: string) => c.startsWith("language-"))
				.forEach((c: string) => {
					el.classList.remove(c);
				});
			if (lang) el.classList.add(`language-${lang}`);
			// ensure hljs base class exists
			el.classList.add("hljs");
			// set content and highlight
			el.textContent = value;
			hljs.highlightElement(el);
		} catch {}
	}, [value, lang]);
	const dp: any = (dataProps as any) || {};
	const { className: extraClass, ...rest } = dp;
	const mergedClassName = mergeClassNames(
		"border border-gray-300 overflow-x-auto my-4 ml-20 text-sm",
		extraClass as string | undefined,
	);
	return (
		<pre className={mergedClassName} {...rest}>
			<code ref={codeRef} className={codeClass} />
		</pre>
	);
};
