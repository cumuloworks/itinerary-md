import hljs from "highlight.js/lib/common";
import type React from "react";

export const CodeBlock: React.FC<{
	lang?: string;
	value: string;
	dataProps?: Record<string, unknown>;
}> = ({ lang, value, dataProps }) => {
	const codeClass = [lang ? `language-${lang}` : undefined, "hljs"]
		.filter(Boolean)
		.join(" ");
	return (
		<pre
			className="border border-gray-300 overflow-x-auto my-4 ml-20 text-sm"
			{...(dataProps as any)}
		>
			<code
				ref={(el) => {
					if (!el) return;
					try {
						if (lang) el.classList.add(`language-${lang}`);
						el.textContent = value;
						hljs.highlightElement(el);
					} catch {}
				}}
				className={codeClass}
			>
				{value}
			</code>
		</pre>
	);
};
