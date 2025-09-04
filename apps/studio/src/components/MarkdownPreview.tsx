import remarkItinerary from '@itinerary-md/core';
import matter from 'gray-matter';
import type { Node as MdastNode, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import React, { type FC, memo } from 'react';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Position } from 'unist';
import { notifyError } from '../core/errors';
import { isValidIanaTimeZone } from '../utils/timezone';
import { EventBlock } from './itinerary/EventBlock';
import { Heading } from './itinerary/Heading';
import 'highlight.js/styles/github.css';
import { DateTime } from 'luxon';
import { isAllowedHref } from '../utils/url';
import Statistics from './itinerary/Statistics';

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
// Minimal shape used by Studio for rendering itmdEvent nodes
type ItmdEventNode = {
    type: 'itmdEvent';
    eventType?: string;
    baseType?: 'transportation' | 'stay' | 'activity';
    title?: any[] | null;
    destination?: { from?: any[]; to?: any[]; at?: any[] } | null;
    time?: { kind: 'none' } | { kind: 'marker'; marker?: 'am' | 'pm' } | { kind: 'point'; startISO?: string | null } | { kind: 'range'; startISO?: string | null; endISO?: string | null };
};

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

    const { reactContent, root, parsedFrontmatter } = React.useMemo(() => {
        try {
            const fm = matter(content);
            const fmTimezone = typeof (fm.data as any)?.timezone === 'string' ? (fm.data as any).timezone : undefined;
            const fmCurrency = typeof (fm.data as any)?.currency === 'string' ? (fm.data as any).currency : undefined;
            const tzFallback = isValidIanaTimeZone(fmTimezone || '') ? (fmTimezone as string) : timezone;
            const mdProcessor = (unified as any)()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkItinerary as any, { tzFallback, currencyFallback: (fmCurrency as string) || currency });
            const mdast = mdProcessor.parse(fm.content || content) as unknown as Root;
            const transformed = mdProcessor.runSync(mdast) as unknown as Root & { children?: MdNode[] };
            // frontmatter を gray-matter で除去してから parse しているため、mdast の position は
            // 元ドキュメントに対してフロントマター分だけ行数がずれる。activeLine（エディタの行番号）に合わせるため
            // data-itin-line-* へはフロントマターの行数オフセットを加算する。
            const prefixIndex = typeof fm.content === 'string' ? content.indexOf(fm.content) : -1;
            const frontmatterOffset = prefixIndex > 0 ? (content.slice(0, prefixIndex).match(/\r?\n/g) || []).length : 0;
            const dateAtLine = new Map<number, { date: string; tz?: string }>();
            const lastStaySegmentsByDate = new Map<string, Array<{ text: string; url?: string }>>();
            let currentDate: { date: string; tz?: string } | undefined;
            let hasPastHeading = false;
            let hasPastByData = false;
            // headingはitmdHeadingに置換済み
            const getLineStart = (n: { position?: { start?: { line?: number } } } | undefined): number | undefined => {
                const l = n?.position?.start?.line as number | undefined;
                return typeof l === 'number' ? l + frontmatterOffset : undefined;
            };
            const getLineEnd = (n: { position?: { end?: { line?: number } } } | undefined): number | undefined => {
                const l = n?.position?.end?.line as number | undefined;
                return typeof l === 'number' ? l + frontmatterOffset : undefined;
            };
            for (const node of (transformed.children || []) as MdNode[]) {
                if ((node as { type?: string }).type === 'itmdHeading') {
                    const d = node as unknown as { type: string; dateISO?: string; timezone?: string };
                    if (d.dateISO) {
                        currentDate = { date: d.dateISO, tz: d.timezone };
                        const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const today = DateTime.now().setZone(zone).startOf('day');
                        const day = DateTime.fromISO(d.dateISO, { zone }).startOf('day');
                        if (day < today) hasPastHeading = true;
                    }
                    continue;
                }
                if ((node as { type?: string })?.type === 'itmdEvent') {
                    const line = getLineStart(node as unknown as { position?: Position });
                    if (line && currentDate) dateAtLine.set(line, currentDate);
                    // 前処理段階で各日付の最終宿泊名を収集（表示可否に関係なく算出）
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
                // data.itmdDate があればそれで過去判定
                const itmdDate = (node as unknown as { data?: { itmdDate?: { dateISO?: string; timezone?: string } } }).data?.itmdDate as { dateISO?: string; timezone?: string } | undefined;
                if (itmdDate?.dateISO) {
                    const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const today = DateTime.now().setZone(zone).startOf('day');
                    const day = DateTime.fromISO(itmdDate.dateISO, { zone }).startOf('day');
                    if (day < today) hasPastByData = true;
                }
            }

            // Inline renderer for CommonMark phrasing nodes
            const renderInline = (nodes: any[] | undefined): React.ReactNode => {
                if (!nodes || nodes.length === 0) return null;
                const out: React.ReactNode[] = [];
                const walk = (n: any, key: string): React.ReactNode => {
                    if (!n) return null;
                    switch (n.type) {
                        case 'text':
                            return n.value as string;
                        case 'emphasis':
                            return (
                                <em key={key} className="italic text-gray-700">
                                    {renderInline(n.children)}
                                </em>
                            );
                        case 'strong':
                            return (
                                <strong key={key} className="font-semibold text-gray-900">
                                    {renderInline(n.children)}
                                </strong>
                            );
                        case 'delete':
                            return <del key={key}>{renderInline(n.children)}</del>;
                        case 'inlineCode':
                            return (
                                <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                                    {typeof n.value === 'string' ? n.value : ''}
                                </code>
                            );
                        case 'link': {
                            const href = typeof n.url === 'string' ? n.url : undefined;
                            if (!href || !isAllowedHref(href)) return renderInline(n.children);
                            return (
                                <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline text-inherit">
                                    {renderInline(n.children)}
                                </a>
                            );
                        }
                        case 'break':
                            return <br key={key} />;
                        default:
                            if (Array.isArray(n.children)) return <React.Fragment key={key}>{renderInline(n.children)}</React.Fragment>;
                            return null;
                    }
                };
                nodes.forEach((n, idx) => {
                    out.push(walk(n, `in-${idx}`));
                });
                return out;
            };

            // Manual build React elements from mdast（カスタムノード優先、非カスタムも描画）
            const els: React.ReactNode[] = [];
            const safeToString = (n: unknown): string => {
                try {
                    return mdastToString(n as MdastNode);
                } catch {
                    return '';
                }
            };

            const renderBlock = (node: MdNode, idx: number): React.ReactNode => {
                if (!node) return null;
                const type = (node as { type?: string }).type;
                const lineStart = getLineStart(node);
                const lineEnd = getLineEnd(node);

                if (type === 'itmdHeading') {
                    const d = node as unknown as { dateISO?: string; timezone?: string };
                    const date = d.dateISO;
                    const tz = d.timezone;
                    if (date) {
                        if (showPastEffective) {
                            const prevStaySegments = (() => {
                                try {
                                    const zone = tz || 'UTC';
                                    const dt = DateTime.fromISO(date, { zone });
                                    const prevISO = dt.minus({ days: 1 }).toISODate();
                                    return prevISO ? lastStaySegmentsByDate.get(prevISO) : undefined;
                                } catch {
                                    return undefined;
                                }
                            })();
                            return (
                                <div key={`h-${lineStart ?? Math.random()}`} className="contents" data-itin-line-start={lineStart ? String(lineStart) : undefined} data-itin-line-end={lineEnd ? String(lineEnd) : undefined}>
                                    <Heading date={date} timezone={tz} prevStaySegments={prevStaySegments} />
                                </div>
                            );
                        }
                    }
                    return null;
                }

                if (type === 'itmdEvent') {
                    const ev = node as unknown as ItmdEventNode;
                    const dateInfo = lineStart ? dateAtLine.get(lineStart) : undefined;
                    const nameSegmentsRaw = inlineToSegments(ev.title as PhrasingContent[] | null | undefined);
                    const nameSegments = Array.isArray(nameSegmentsRaw) && nameSegmentsRaw.length > 0 ? nameSegmentsRaw : undefined;
                    const nameText = (() => {
                        try {
                            if (Array.isArray(ev.title)) {
                                const pseudo = { type: 'paragraph', children: ev.title } as unknown as MdastNode;
                                const s = mdastToString(pseudo);
                                if (typeof s === 'string' && s.trim()) return s.trim();
                            }
                        } catch {}
                        const plain = segmentsToPlainText(nameSegments);
                        return plain?.trim() || '';
                    })();
                    const baseType = (ev as { baseType?: 'transportation' | 'stay' | 'activity' }).baseType ?? 'activity';
                    const t = ev.eventType as string;
                    const depSegs = ev.destination && (ev.destination as any).from ? inlineToSegments((ev.destination as any).from) : undefined;
                    const arrSegs = ev.destination && ((ev.destination as any).to || (ev.destination as any).at) ? inlineToSegments(((ev.destination as any).to ?? (ev.destination as any).at) as PhrasingContent[]) : undefined;
                    const metadata: Record<string, string> = {};
                    // body からセグメント生成: inline はそのまま、meta は Record<string,string> 化（リンクは segments に埋める）
                    const bodySegments = (() => {
                        const body = (ev as any).body as Array<any> | undefined;
                        if (!Array.isArray(body)) return undefined;
                        const segs: Array<
                            | { kind: 'inline'; segments: Array<{ text: string; url?: string }> }
                            | { kind: 'meta'; entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> }
                            | { kind: 'list'; items: Array<Array<{ text: string; url?: string }>>; ordered?: boolean; start?: number | null }
                        > = [];
                        for (const s of body) {
                            if (!s || typeof s !== 'object') continue;
                            if (s.kind === 'inline') {
                                const inline = Array.isArray(s.content) ? (s.content as PhrasingContent[]) : [];
                                const seg = inlineToSegments(inline) || [];
                                if (seg.length > 0) segs.push({ kind: 'inline', segments: seg });
                            } else if (s.kind === 'meta') {
                                const m = s.entries as Array<{ key: string; value: PhrasingContent[] }> | undefined;
                                const entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> = [];
                                for (const e of m || []) {
                                    const seg = inlineToSegments(e.value) || [];
                                    if (e.key) entries.push({ key: e.key, segments: seg });
                                }
                                if (entries.length > 0) segs.push({ kind: 'meta', entries });
                            } else if (s.kind === 'list') {
                                const items = Array.isArray(s.items) ? (s.items as PhrasingContent[][]) : [];
                                const listSegs = items.map((inline) => inlineToSegments(inline) || []);
                                const ordered = !!(s as any).ordered;
                                const start = typeof (s as any).start === 'number' ? ((s as any).start as number) : undefined;
                                if (listSegs.length > 0) segs.push({ kind: 'list', items: listSegs, ordered, start });
                            }
                        }
                        return segs.length > 0 ? segs : undefined;
                    })();
                    const timeKind = ev.time?.kind as 'marker' | 'point' | 'range' | 'none' | undefined;
                    const startISO = timeKind === 'point' || timeKind === 'range' ? ((ev.time as any)?.startISO as string | undefined) : undefined;
                    const endISO = timeKind === 'range' ? ((ev.time as any)?.endISO as string | undefined) : undefined;
                    const marker = timeKind === 'marker' ? ((ev.time as any)?.marker as 'am' | 'pm' | undefined) : undefined;
                    const itmdPrice = (ev as unknown as { data?: { itmdPrice?: Array<{ key: string; raw: string; price: { tokens?: Array<any> } }> } }).data?.itmdPrice as
                        | Array<{ key: string; raw: string; price: { tokens?: Array<any> } }>
                        | undefined;
                    const priceInfos: Array<{ key: string; currency: string; amount: number }> | undefined = (() => {
                        if (!Array.isArray(itmdPrice)) return undefined;
                        const out: Array<{ key: string; currency: string; amount: number }> = [];
                        for (const p of itmdPrice) {
                            const tok = Array.isArray(p.price?.tokens) ? p.price.tokens[0] : undefined;
                            if (!tok || tok.kind !== 'money') continue;
                            const cur = String(tok.normalized?.currency || tok.currency || '').toUpperCase();
                            const amtStr = String(tok.normalized?.amount || tok.amount || '');
                            const amt = Number(amtStr);
                            if (!cur || !Number.isFinite(amt)) continue;
                            out.push({ key: p.key, currency: cur, amount: amt });
                        }
                        return out.length > 0 ? out : undefined;
                    })();

                    const eventData = {
                        baseType,
                        type: t,
                        name: baseType !== 'stay' ? nameText : undefined,
                        stayName: baseType === 'stay' ? nameText : undefined,
                        departure: depSegs ? segmentsToPlainText(depSegs) || undefined : undefined,
                        arrival: arrSegs ? segmentsToPlainText(arrSegs) || undefined : undefined,
                        location: baseType !== 'transportation' ? segmentsToPlainText(arrSegs) || undefined : undefined,
                        metadata,
                    } as any;
                    {
                        const isPast = (() => {
                            const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                            if (dateInfo?.date) {
                                const day = DateTime.fromISO(dateInfo.date, { zone }).startOf('day');
                                const today = DateTime.now().setZone(zone).startOf('day');
                                return day < today;
                            }
                            return false;
                        })();

                        if (!showPastEffective && isPast) {
                            // skip rendering when past and showPast=false
                            return null;
                        }
                        const dateStrForDisplay = (dateInfo?.date as string | undefined) ?? (startISO ? DateTime.fromISO(startISO).toISODate() || undefined : undefined);
                        return (
                            <div key={`e-${lineStart ?? Math.random()}`} className="contents" data-itin-line-start={lineStart ? String(lineStart) : undefined} data-itin-line-end={lineEnd ? String(lineEnd) : undefined}>
                                <EventBlock
                                    eventData={eventData}
                                    dateStr={dateStrForDisplay}
                                    timezone={displayTimezone}
                                    currency={currency}
                                    priceInfos={priceInfos}
                                    nameSegments={nameSegments}
                                    departureSegments={depSegs}
                                    arrivalSegments={arrSegs}
                                    startISO={startISO ?? null}
                                    endISO={endISO ?? null}
                                    marker={marker ?? null}
                                    bodySegments={bodySegments}
                                />
                            </div>
                        );
                    }
                }

                if (type === 'heading') {
                    const depth = (node as { depth?: number }).depth || 1;
                    const text = safeToString(node).trim();
                    if (!text) return null;
                    const dataProps: any = {
                        'data-itin-line-start': lineStart ? String(lineStart) : undefined,
                        'data-itin-line-end': lineEnd ? String(lineEnd) : undefined,
                    };
                    const hClass = (() => {
                        switch (depth) {
                            case 1:
                                return 'text-4xl font-bold text-gray-900 mb-6 mt-6 ml-0';
                            case 2:
                                return 'text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6 ml-0';
                            case 3:
                                return 'text-lg font-semibold text-gray-800 mb-3 mt-6 ml-0';
                            case 4:
                                return 'text-base font-semibold text-gray-800 mb-2 mt-4 ml-0';
                            case 5:
                                return 'text-sm font-semibold text-gray-800 mb-2 mt-4 ml-0';
                            default:
                                return 'text-xs font-semibold text-gray-800 mb-2 mt-4 ml-0';
                        }
                    })();
                    switch (depth) {
                        case 1:
                            return (
                                <h1 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h1>
                            );
                        case 2:
                            return (
                                <h2 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h2>
                            );
                        case 3:
                            return (
                                <h3 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h3>
                            );
                        case 4:
                            return (
                                <h4 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h4>
                            );
                        case 5:
                            return (
                                <h5 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h5>
                            );
                        default:
                            return (
                                <h6 key={`h-${lineStart ?? idx}`} className={hClass} {...dataProps}>
                                    {text}
                                </h6>
                            );
                    }
                }

                if (type === 'paragraph') {
                    return (
                        <p
                            key={`p-${lineStart ?? idx}`}
                            className="mb-4 leading-relaxed text-gray-800 text-base ml-24"
                            data-itin-line-start={lineStart ? String(lineStart) : undefined}
                            data-itin-line-end={lineEnd ? String(lineEnd) : undefined}
                        >
                            {renderInline(((node as any).children as any[]) || [])}
                        </p>
                    );
                }

                if (type === 'list') {
                    const ordered = !!(node as any).ordered;
                    const start = (node as any).start as number | undefined;
                    const items = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
                    const listDataProps: any = {
                        'data-itin-line-start': lineStart ? String(lineStart) : undefined,
                        'data-itin-line-end': lineEnd ? String(lineEnd) : undefined,
                    };
                    const listProps: any = { ...listDataProps };
                    if (ordered && typeof start === 'number') listProps.start = start;
                    const children = items.map((li, i) => {
                        const liStart = getLineStart(li);
                        const liEnd = getLineEnd(li);
                        const isTask = typeof li.checked === 'boolean';
                        const isChecked = !!li.checked;
                        const checkbox = isTask ? <input type="checkbox" checked={isChecked} readOnly className="absolute -left-6 top-1 w-4 h-4 rounded border-2 border-gray-400 bg-white accent-blue-600" /> : null;
                        // listItem children can be paragraph or other blocks
                        const liChildren = Array.isArray(li.children) ? li.children : [];
                        const liClass = `mb-2 leading-relaxed text-gray-800 ${isTask ? 'task-list-item list-none relative' : ''}`;
                        return (
                            <li key={`li-${liStart ?? i}`} className={liClass} data-itin-line-start={liStart ? String(liStart) : undefined} data-itin-line-end={liEnd ? String(liEnd) : undefined}>
                                {checkbox}
                                {liChildren.map((c: any, ci: number) => {
                                    const cStart = getLineStart(c);
                                    const key = `lic-${cStart ?? ci}`;
                                    if (c.type === 'paragraph')
                                        return (
                                            <span key={key} className={isTask && isChecked ? 'text-gray-500 line-through' : undefined}>
                                                {renderInline(c.children || [])}
                                            </span>
                                        );
                                    // For nested blocks, renderBlock adds its own keys; wrap to provide a stable key at this level
                                    return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
                                })}
                            </li>
                        );
                    });
                    return ordered ? (
                        <ol key={`list-${lineStart ?? idx}`} className="mb-6 space-y-2 ml-24 list-decimal" {...listProps}>
                            {children}
                        </ol>
                    ) : (
                        <ul key={`list-${lineStart ?? idx}`} className="mb-6 space-y-2 ml-24 list-disc marker:text-blue-600 marker:font-bold marker:text-lg" {...listProps}>
                            {children}
                        </ul>
                    );
                }

                if (type === 'blockquote') {
                    // 過去日のブロックは非表示
                    if (!showPastEffective) {
                        const dateInfo = lineStart ? dateAtLine.get(lineStart) : undefined;
                        const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                        if (dateInfo?.date) {
                            const day = DateTime.fromISO(dateInfo.date, { zone }).startOf('day');
                            const today = DateTime.now().setZone(zone).startOf('day');
                            if (day < today) return null;
                        }
                    }
                    const children = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
                    return (
                        <blockquote
                            key={`bq-${lineStart ?? idx}`}
                            className="my-4 pl-4 border-l-4 border-gray-200 text-gray-500 ml-24"
                            data-itin-line-start={lineStart ? String(lineStart) : undefined}
                            data-itin-line-end={lineEnd ? String(lineEnd) : undefined}
                        >
                            {children.map((c: any, ci: number) => {
                                const cStart = getLineStart(c);
                                const key = `bqc-${cStart ?? ci}`;
                                if (c.type === 'paragraph') return <p key={key}>{renderInline(c.children || [])}</p>;
                                return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
                            })}
                        </blockquote>
                    );
                }

                if (type === 'code') {
                    const lang = typeof (node as any).lang === 'string' ? (node as any).lang : undefined;
                    const value = typeof (node as any).value === 'string' ? (node as any).value : '';
                    return (
                        <pre
                            key={`pre-${lineStart ?? idx}`}
                            className="bg-gray-50 border border-gray-200 rounded-md overflow-x-auto my-4 ml-20"
                            data-itin-line-start={lineStart ? String(lineStart) : undefined}
                            data-itin-line-end={lineEnd ? String(lineEnd) : undefined}
                        >
                            <code className={lang ? `language-${lang}` : undefined}>{value}</code>
                        </pre>
                    );
                }

                if (type === 'thematicBreak') {
                    return <hr key={`hr-${lineStart ?? idx}`} className="my-8 border-gray-300" data-itin-line-start={lineStart ? String(lineStart) : undefined} data-itin-line-end={lineEnd ? String(lineEnd) : undefined} />;
                }

                // Fallback: ignore unknown block types
                return null;
            };

            for (const [idx, node] of ((transformed.children || []) as MdNode[]).entries()) {
                const rendered = renderBlock(node, idx);
                if (rendered) els.push(rendered);
            }
            const hasHiddenPast = !showPastEffective && (hasPastHeading || hasPastByData);
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
            } as any;
        } catch {
            return { reactContent: null as React.ReactNode, root: null, parsedFrontmatter: {} as Record<string, unknown> } as any;
        }
    }, [content, timezone, currency, showPastEffective, displayTimezone]);

    // legacy props no longer used; Statistics computes from mdRoot and frontmatter

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
            <Statistics root={root as any} frontmatter={safeParsedFrontmatter} timezone={timezone} currency={currency} />
            {reactContent}
        </div>
    );
};

export const MarkdownPreview = memo(MarkdownPreviewComponent);
