import { DateTime } from 'luxon';
import type { Node as MdastNode, PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import React from 'react';
import { EventBlock } from '../itinerary/EventBlock';
import { Heading } from '../itinerary/Heading';
import { renderInline } from './renderInline';
import { getHProps, mergeClassNames } from './utils';

type MdNode = { type?: string; depth?: number; children?: any[]; position?: { start?: { line: number; column?: number }; end?: { line: number; column?: number } } };

type ItmdEventNode = {
    type: 'itmdEvent';
    eventType?: string;
    baseType?: 'transportation' | 'stay' | 'activity';
    title?: any[] | null;
    destination?: { from?: any[]; to?: any[]; at?: any[] } | null;
    time?: { kind: 'none' } | { kind: 'marker'; marker?: 'am' | 'pm' } | { kind: 'point'; startISO?: string | null } | { kind: 'range'; startISO?: string | null; endISO?: string | null };
};

export type RenderBlockContext = {
    getLineStart: (n: { position?: { start?: { line?: number } } } | undefined) => number | undefined;
    getLineEnd: (n: { position?: { end?: { line?: number } } } | undefined) => number | undefined;
    getNodeDateAttr: (n: unknown) => string | undefined;
    isPastISODate: (iso?: string) => boolean;
    showPastEffective: boolean;
    displayTimezone: string;
    currency?: string;
    lastStaySegmentsByDate: Map<string, Array<{ text: string; url?: string }>>;
    inlineToSegments: (inline?: PhrasingContent[] | null) => Array<{ text: string; url?: string; kind?: 'text' | 'code' }> | undefined;
    segmentsToPlainText: (segments?: Array<{ text: string; url?: string }>) => string | undefined;
};

// utils moved to ./utils

const safeToString = (n: unknown): string => {
    try {
        return mdastToString(n as MdastNode);
    } catch {
        return '';
    }
};

export const createRenderBlock = (ctx: RenderBlockContext) => {
    const { getLineStart, getLineEnd, getNodeDateAttr, isPastISODate, showPastEffective, displayTimezone, currency, lastStaySegmentsByDate, inlineToSegments, segmentsToPlainText } = ctx;

    const renderBlock = (node: MdNode, idx: number): React.ReactNode => {
        if (!node) return null;
        const type = (node as { type?: string }).type;
        const lineStart = getLineStart(node);
        const lineEnd = getLineEnd(node);
        const nodeDateAttr = getNodeDateAttr(node);
        const commonDataProps: any = {
            'data-itin-line-start': lineStart ? String(lineStart) : undefined,
            'data-itin-line-end': lineEnd ? String(lineEnd) : undefined,
            'data-itmd-date': nodeDateAttr,
        };

        if (type === 'itmdHeading') {
            const d = node as unknown as { dateISO?: string; timezone?: string };
            const date = d.dateISO;
            const tz = d.timezone;
            if (date) {
                const isPast = isPastISODate(nodeDateAttr);
                if (!showPastEffective && isPast) return null;
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
                    <div key={`h-${lineStart ?? idx}`} className="contents" {...commonDataProps}>
                        <Heading date={date} timezone={tz} prevStaySegments={prevStaySegments} />
                    </div>
                );
            }
            return null;
        }

        if (type === 'itmdEvent') {
            const ev = node as unknown as ItmdEventNode;
            const dateInfo = nodeDateAttr ? { date: nodeDateAttr } : undefined;
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
                const isPast = isPastISODate(nodeDateAttr);

                if (!showPastEffective && isPast) {
                    return null;
                }
                const dateStrForDisplay = (dateInfo?.date as string | undefined) ?? (startISO ? DateTime.fromISO(startISO, { zone: displayTimezone }).toISODate() || undefined : undefined);
                return (
                    <div key={`e-${lineStart ?? idx}`} className="contents" {...commonDataProps}>
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
            const dataProps: any = { ...commonDataProps };
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
            if (!showPastEffective && isPastISODate(nodeDateAttr)) return null;
            const hProps = getHProps(node);
            const { className: hClass, ...hRest } = hProps as any;
            const pClass = mergeClassNames('mb-4 leading-relaxed text-gray-800 text-base ml-24', hClass as string | undefined);
            return (
                <p key={`p-${lineStart ?? idx}`} className={pClass} {...hRest} {...commonDataProps}>
                    {renderInline(((node as any).children as any[]) || [])}
                </p>
            );
        }

        if (type === 'list') {
            if (!showPastEffective && isPastISODate(nodeDateAttr)) return null;
            const ordered = !!(node as any).ordered;
            const start = (node as any).start as number | undefined;
            const items = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
            const listDataProps: any = { ...commonDataProps };
            const listProps: any = { ...listDataProps };
            if (ordered && typeof start === 'number') listProps.start = start;
            const children = items.map((li, i) => {
                const liStart = getLineStart(li);
                const liEnd = getLineEnd(li);
                const isTask = typeof li.checked === 'boolean';
                const isChecked = !!li.checked;
                const checkbox = isTask ? <input type="checkbox" checked={isChecked} readOnly className="absolute -left-6 top-1 w-4 h-4 rounded border-2 border-gray-400 bg-white accent-blue-600" /> : null;
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
            if (!showPastEffective && isPastISODate(nodeDateAttr)) return null;
            const children = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
            const hProps = getHProps(node);
            const { className: hClass, ...hRest } = hProps as any;
            const hasAlert = typeof hClass === 'string' && (hClass as string).split(/\s+/).includes('markdown-alert');
            const baseBq = hasAlert ? 'ml-20' : 'my-4 pl-4 border-l-4 border-gray-200 text-gray-500 ml-20';
            const bqClass = mergeClassNames(baseBq, hClass as string | undefined);

            const renderChildren = () => {
                if (!hasAlert) {
                    return children.map((c: any, ci: number) => {
                        const cStart = getLineStart(c);
                        const key = `bqc-${cStart ?? ci}`;
                        if (c.type === 'paragraph') {
                            const chProps = getHProps(c);
                            const { className: chClass, ...chRest } = chProps as any;
                            return (
                                <p key={key} className={typeof chClass === 'string' ? chClass : undefined} {...chRest}>
                                    {renderInline(c.children || [])}
                                </p>
                            );
                        }
                        return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
                    });
                }
                const out: React.ReactNode[] = [];
                for (let ci = 0; ci < children.length; ci++) {
                    const c = children[ci];
                    const cStart = getLineStart(c);
                    const key = `bqc-${cStart ?? ci}`;
                    if (c?.type === 'paragraph') {
                        const chProps = getHProps(c);
                        const { className: chClass, ...chRest } = chProps as any;
                        const cls = typeof chClass === 'string' ? chClass : '';
                        const isTitle = cls.split(/\s+/).includes('markdown-alert-title');
                        if (isTitle) {
                            out.push(
                                <p key={key} className={cls || undefined} {...chRest}>
                                    {renderInline(c.children || [])}
                                </p>
                            );
                            continue;
                        }
                        out.push(
                            <p key={key} className={cls || undefined} {...chRest}>
                                {renderInline(c.children || [])}
                            </p>
                        );
                        continue;
                    }
                    out.push(<React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>);
                }
                return out;
            };

            return (
                <blockquote key={`bq-${lineStart ?? idx}`} className={bqClass} {...hRest} {...commonDataProps}>
                    {renderChildren()}
                </blockquote>
            );
        }

        if (type === 'code') {
            if (!showPastEffective && isPastISODate(nodeDateAttr)) return null;
            const lang = typeof (node as any).lang === 'string' ? (node as any).lang : undefined;
            const value = typeof (node as any).value === 'string' ? (node as any).value : '';
            return (
                <pre key={`pre-${lineStart ?? idx}`} className="bg-gray-50 border border-gray-200 rounded-md overflow-x-auto my-4 ml-20" {...commonDataProps}>
                    <code className={lang ? `language-${lang}` : undefined}>{value}</code>
                </pre>
            );
        }

        if (type === 'thematicBreak') {
            if (!showPastEffective && isPastISODate(nodeDateAttr)) return null;
            return <hr key={`hr-${lineStart ?? idx}`} className="my-8 border-gray-300" {...commonDataProps} />;
        }

        return null;
    };

    return renderBlock;
};
