import remarkItinerary from '@itinerary-md/core';
import matter from 'gray-matter';
import type { PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import React, { type FC, memo } from 'react';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { notifyError } from '../core/errors';
import { isValidIanaTimeZone } from '../utils/timezone';
import 'highlight.js/styles/github.css';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import 'remark-github-blockquote-alert/alert.css';
import { DateTime } from 'luxon';
import Statistics from './itinerary/Statistics';
import { createRenderNode } from './render';

interface MarkdownPreviewProps {
    content: string;
    timezone?: string;
    currency?: string;
    title?: string;
    showPast?: boolean;
    scrollToRatio?: number;
    activeLine?: number;
    autoScroll?: boolean;
}

//

type MdNode = { type?: string; depth?: number; children?: any[]; position?: { start?: { line: number; column?: number }; end?: { line: number; column?: number } } };

type TextSegment = { text: string; url?: string; kind?: 'text' | 'code' };

const inlineToSegments = (inline?: PhrasingContent[] | null): TextSegment[] | undefined => {
    if (!inline || !Array.isArray(inline)) return undefined;
    const segs: TextSegment[] = [];
    const walk = (n: any) => {
        if (!n) return;
        if (n.type === 'text' && typeof n.value === 'string') segs.push({ text: n.value });
        else if (n.type === 'inlineCode' && typeof n.value === 'string') segs.push({ text: n.value, kind: 'code' });
        else if (n.type === 'link' && typeof n.url === 'string') {
            const text = (mdastToString as any)(n);
            segs.push({ text, url: n.url });
        } else if (Array.isArray(n.children)) n.children.forEach(walk);
    };
    inline.forEach(walk);
    return segs;
};

const segmentsToPlainText = (segments?: TextSegment[]): string | undefined => (Array.isArray(segments) ? segments.map((s) => s.text).join('') : undefined);

const MarkdownPreviewComponent: FC<MarkdownPreviewProps> = ({ content, timezone, currency, showPast, title, activeLine, autoScroll = true }) => {
    const displayTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const showPastEffective = typeof showPast === 'boolean' ? showPast : true;

    const { reactContent, root, parsedFrontmatter, isItmd } = React.useMemo(() => {
        try {
            const fm = matter(content);
            const fmTimezone = typeof (fm.data as any)?.timezone === 'string' ? (fm.data as any).timezone : undefined;
            const fmCurrency = typeof (fm.data as any)?.currency === 'string' ? (fm.data as any).currency : undefined;
            const fmType =
                typeof (fm.data as any)?.type === 'string'
                    ? String((fm.data as any).type)
                          .trim()
                          .toLowerCase()
                    : undefined;
            const isItmdDoc = fmType === 'itmd' || fmType === 'itinerary-md' || fmType === 'tripmd';
            const tzFallback = isValidIanaTimeZone(fmTimezone || '') ? (fmTimezone as string) : timezone;
            const mdProcessor = (unified as any)()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkGithubBlockquoteAlert as any);
            if (isItmdDoc) {
                (mdProcessor as any).use(remarkItinerary as any, { tzFallback, currencyFallback: (fmCurrency as string) || currency });
            }
            const mdast = mdProcessor.parse(fm.content || content) as unknown as Root;
            const transformed = mdProcessor.runSync(mdast) as unknown as Root & { children?: MdNode[] };
            const prefixIndex = typeof fm.content === 'string' ? content.indexOf(fm.content) : -1;
            const frontmatterOffset = prefixIndex > 0 ? (content.slice(0, prefixIndex).match(/\r?\n/g) || []).length : 0;
            const lastStaySegmentsByDate = new Map<string, Array<{ text: string; url?: string }>>();
            let currentDate: { date: string; tz?: string } | undefined;
            let hasPastByAttr = false;
            const getLineStart = (n: { position?: { start?: { line?: number } } } | undefined): number | undefined => {
                const l = n?.position?.start?.line as number | undefined;
                return typeof l === 'number' ? l + frontmatterOffset : undefined;
            };
            const getLineEnd = (n: { position?: { end?: { line?: number } } } | undefined): number | undefined => {
                const l = n?.position?.end?.line as number | undefined;
                return typeof l === 'number' ? l + frontmatterOffset : undefined;
            };
            const getNodeDateAttr = (n: unknown): string | undefined => {
                try {
                    const d = (n as { data?: { hProperties?: Record<string, unknown> } })?.data?.hProperties as Record<string, unknown> | undefined;
                    const v = d && (d['data-itmd-date'] as unknown);
                    return typeof v === 'string' && v.trim() ? v : undefined;
                } catch {
                    return undefined;
                }
            };
            const zoneForCompare = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const isPastISODate = (iso?: string): boolean => {
                if (!iso) return false;
                try {
                    const today = DateTime.now().setZone(zoneForCompare).startOf('day');
                    const day = DateTime.fromISO(iso, { zone: zoneForCompare }).startOf('day');
                    return day < today;
                } catch {
                    return false;
                }
            };
            for (const node of (transformed.children || []) as MdNode[]) {
                if ((node as { type?: string }).type === 'itmdHeading') {
                    const d = node as unknown as { type: string; dateISO?: string; timezone?: string };
                    if (d.dateISO) {
                        currentDate = { date: d.dateISO, tz: d.timezone };
                    }
                    continue;
                }
                if ((node as { type?: string })?.type === 'itmdEvent') {
                    try {
                        if (currentDate) {
                            const ev = node as unknown as { baseType?: string; title?: any[] };
                            if (ev?.baseType === 'stay') {
                                try {
                                    const segs = inlineToSegments(ev.title as any) || [];
                                    if (segs.length > 0) lastStaySegmentsByDate.set(currentDate.date, segs);
                                } catch {}
                            }
                        }
                    } catch {}
                }
                const attrDate = getNodeDateAttr(node);
                if (isPastISODate(attrDate)) hasPastByAttr = true;
            }

            const els: React.ReactNode[] = [];

            const renderNode = createRenderNode({
                getLineStart,
                getLineEnd,
                getNodeDateAttr,
                isPastISODate,
                showPastEffective,
                displayTimezone,
                currency,
                lastStaySegmentsByDate,
                inlineToSegments,
                segmentsToPlainText,
            });

            for (const [idx, node] of ((transformed.children || []) as MdNode[]).entries()) {
                const rendered = renderNode(node as any, idx);
                if (rendered) els.push(rendered);
            }
            const hasHiddenPast = !showPastEffective && hasPastByAttr;
            const topBanner = hasHiddenPast ? (
                <div className="flex items-center text-gray-500 text-xs mt-6 mb-4" data-itin-line-start={undefined} data-itin-line-end={undefined}>
                    <span className="flex-1 border-t border-gray-200" />
                    <span className="px-2">Past events are hidden</span>
                    <span className="flex-1 border-t border-gray-200" />
                </div>
            ) : null;
            return {
                reactContent: (
                    <>
                        {topBanner}
                        {els}
                    </>
                ),
                root: transformed,
                parsedFrontmatter: (fm.data || {}) as Record<string, unknown>,
                isItmd: isItmdDoc,
            } as any;
        } catch {
            return { reactContent: null as React.ReactNode, root: null, parsedFrontmatter: {} as Record<string, unknown>, isItmd: false } as any;
        }
    }, [content, timezone, currency, showPastEffective, displayTimezone]);

    const safeParsedFrontmatter = parsedFrontmatter as Record<string, unknown>;

    const frontmatterTz = typeof safeParsedFrontmatter?.timezone === 'string' ? (safeParsedFrontmatter.timezone as string) : undefined;
    React.useEffect(() => {
        if (frontmatterTz && !isValidIanaTimeZone(frontmatterTz)) {
            notifyError(`Frontmatter timezone "${frontmatterTz}" is invalid. Using fallback.`);
        }
    }, [frontmatterTz]);

    const containerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!autoScroll) return;
        if (!activeLine || !containerRef.current) return;
        const container = containerRef.current;
        let nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-itin-line-start], [data-itin-line-end]'));
        if (nodes.length === 0) {
            nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-sourcepos]'));
        }
        if (nodes.length === 0) return;
        const line = activeLine;
        let best: { el: HTMLElement; score: number } | null = null;
        for (const el of nodes) {
            const ds = el.dataset || {};
            let start = Number(ds.itinLineStart || ds.lineStart || NaN);
            let end = Number(ds.itinLineEnd || ds.lineEnd || NaN);
            if ((!Number.isFinite(start) || !Number.isFinite(end)) && typeof ds.sourcepos === 'string') {
                const sp = ds.sourcepos;
                const parts = sp.split('-');
                if (parts.length === 2) {
                    const s = parts[0].split(':')[0];
                    const e = parts[1].split(':')[0];
                    const sNum = Number(s);
                    const eNum = Number(e);
                    if (Number.isFinite(sNum)) start = sNum;
                    if (Number.isFinite(eNum)) end = eNum;
                }
            }
            const hasStart = Number.isFinite(start);
            const hasEnd = Number.isFinite(end);
            let contains = false;
            if (hasStart && hasEnd) contains = start <= line && line <= end;
            else if (hasStart) contains = start === line;
            else if (hasEnd) contains = end === line;
            if (contains) {
                best = { el, score: 0 };
                break;
            }
            if (hasStart && start <= line) {
                const score = line - start;
                if (!best || score < best.score) best = { el, score };
            }
        }
        const target = best?.el || nodes[0];
        if (!target) return;
        const hasBox = (el: Element) => el.getClientRects().length > 0;
        let boxTarget: HTMLElement | null = hasBox(target) ? target : null;
        if (!boxTarget) {
            const descendants = target.querySelectorAll<HTMLElement>('*');
            for (const el of Array.from(descendants)) {
                if (hasBox(el)) {
                    boxTarget = el;
                    break;
                }
            }
        }
        if (!boxTarget) boxTarget = target;
        const cRect = container.getBoundingClientRect();
        const tRect = boxTarget.getBoundingClientRect();
        const margin = 8;
        const visible = tRect.bottom > cRect.top + margin && tRect.top < cRect.bottom - margin;
        if (visible) return;
        const delta = tRect.top - cRect.top - container.clientHeight / 2 + tRect.height / 2;
        container.scrollBy({ top: delta, behavior: 'smooth' });
    }, [activeLine, autoScroll]);

    return (
        <div ref={containerRef} className="markdown-preview h-full px-8 py-4 bg-white overflow-auto">
            {title && <h1 className="text-4xl font-bold text-gray-900 mb-6 mt-6 ml-0">{title}</h1>}
            {isItmd && <Statistics root={root as any} frontmatter={safeParsedFrontmatter} timezone={timezone} currency={currency} />}
            {reactContent}
        </div>
    );
};

export const MarkdownPreview = memo(MarkdownPreviewComponent);
