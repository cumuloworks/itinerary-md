import matter from 'gray-matter';
import type { Root } from 'mdast';
import { type FC, memo, useMemo } from 'react';
import ReactJson from 'react18-json-view';
import remarkItinerary from 'remark-itinerary';
import 'react18-json-view/src/style.css';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { normalizeCurrencyCode } from '../utils/currency';

interface MdastViewProps {
    content: string;
    timezone?: string;
    currency?: string;
}

// Sanitize MDAST tree for safe JSON.stringify (avoid functions/symbols and large/custom props)
function sanitizeNode(node: any, allowAllPlainObjects = false): any {
    if (node == null) return node;
    if (Array.isArray(node)) return node.map((v) => sanitizeNode(v, allowAllPlainObjects));
    if (typeof node !== 'object') return node;

    const nodeType = (node as any)?.type as unknown;
    const isCustomItmd = nodeType === 'itmdEvent' || nodeType === 'itmdHeading';
    if (isCustomItmd) {
        const out: any = {};
        for (const k of Object.keys(node)) {
            const v = (node as any)[k];
            if (typeof v === 'function' || typeof v === 'symbol') continue;
            out[k] = sanitizeNode(v, true);
        }
        return out;
    }

    if (allowAllPlainObjects && typeof (node as any)?.type !== 'string') {
        const out: any = {};
        for (const k of Object.keys(node)) {
            const v = (node as any)[k];
            if (typeof v === 'function' || typeof v === 'symbol') continue;
            out[k] = sanitizeNode(v, true);
        }
        return out;
    }

    const allowedKeys = new Set([
        // generic mdast
        'type',
        'value',
        'lang',
        'meta',
        'identifier',
        'label',
        'alt',
        'url',
        'title',
        'depth',
        'ordered',
        'start',
        'spread',
        'checked',
        'position',
        'data',
        'children',
        // itmd custom nodes
        'eventType',
        'baseType',
        'time',
        'destination',
        'body',
        'warnings',
        'positions',
        'version',
        'dateISO',
        'timezone',
    ]);
    const out: any = {};
    for (const k of Object.keys(node)) {
        if (!allowedKeys.has(k)) continue;
        const v = (node as any)[k];
        if (k === 'data' && v && typeof v === 'object') {
            // Keep hProperties, hName, and any keys starting with "itmd"
            const allowedDataKeys = new Set(['hProperties', 'hName']);
            const dataOut: any = {};
            for (const dk of Object.keys(v)) {
                const isItmd = dk.startsWith('itmd');
                if (!allowedDataKeys.has(dk) && !isItmd) continue;
                const dv = (v as any)[dk];
                if (dk === 'hProperties' && dv && typeof dv === 'object') {
                    // Shallow copy hProperties with only primitive values
                    const hpOut: any = {};
                    for (const hk of Object.keys(dv)) {
                        const hv = (dv as any)[hk];
                        if (hv == null) continue;
                        if (typeof hv === 'string' || typeof hv === 'number' || typeof hv === 'boolean') {
                            hpOut[hk] = hv;
                        }
                    }
                    dataOut[dk] = hpOut;
                } else {
                    dataOut[dk] = sanitizeNode(dv, true);
                }
            }
            out[k] = dataOut;
            continue;
        }
        if (k === 'time' && v && typeof v === 'object') {
            // time is a tagged union; keep primitives and nested objects shallowly
            const timeOut: any = {};
            for (const tk of Object.keys(v)) {
                const tv = (v as any)[tk];
                if (tv == null) continue;
                if (typeof tv === 'string' || typeof tv === 'number' || typeof tv === 'boolean') {
                    timeOut[tk] = tv;
                } else if (typeof tv === 'object') {
                    const inner: any = {};
                    for (const ik of Object.keys(tv)) {
                        const iv = (tv as any)[ik];
                        if (iv == null) continue;
                        if (typeof iv === 'string' || typeof iv === 'number' || typeof iv === 'boolean') inner[ik] = iv;
                    }
                    timeOut[tk] = inner;
                }
            }
            out[k] = timeOut;
            continue;
        }
        out[k] = sanitizeNode(v, allowAllPlainObjects);
    }
    return out;
}

const MdastViewComponent: FC<MdastViewProps> = ({ content, timezone, currency }) => {
    const tree = useMemo(() => {
        try {
            const fm = matter(content);
            const fmTimezoneRaw = typeof (fm.data as any)?.timezone === 'string' ? (fm.data as any).timezone : undefined;
            const fmCurrencyRaw = typeof (fm.data as any)?.currency === 'string' ? (fm.data as any).currency : undefined;
            const fmType =
                typeof (fm.data as any)?.type === 'string'
                    ? String((fm.data as any).type)
                          .trim()
                          .toLowerCase()
                    : undefined;
            const isItmdDoc = fmType === 'itmd' || fmType === 'itinerary-md' || fmType === 'tripmd';

            const tzFallback = fmTimezoneRaw || timezone;
            const mdProcessor = (unified as any)()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkGithubBlockquoteAlert as any);
            if (isItmdDoc) {
                const normalizedCurrency = normalizeCurrencyCode(fmCurrencyRaw || currency, currency || 'USD');
                (mdProcessor as any).use(remarkItinerary as any, {
                    tzFallback,
                    currencyFallback: normalizedCurrency,
                });
            }
            const mdast = mdProcessor.parse(fm.content || content) as unknown as Root;
            const transformed = mdProcessor.runSync(mdast) as unknown as Root;
            return sanitizeNode(transformed);
        } catch {
            return undefined;
        }
    }, [content, timezone, currency]);

    return (
        <div className="h-full w-full bg-white p-2">
            {tree ? (
                <div className="h-full w-full overflow-auto">
                    <ReactJson
                        src={tree as any}
                        theme="github"
                        enableClipboard={false}
                        collapsed={({ depth }: { depth: number }) => depth > 3}
                        displayArrayIndex={false}
                        style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: 12,
                        }}
                    />
                </div>
            ) : (
                <pre className="h-full w-full overflow-auto text-xs leading-5 p-4 text-gray-800 bg-white">Parse error or empty content</pre>
            )}
        </div>
    );
};

export const MdastView = memo(MdastViewComponent);
