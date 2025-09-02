import { isValidIanaTimeZone, parseItineraryEvents, remarkItinerary } from '@itinerary-md/core';
import matter from 'gray-matter';
import React, { type FC, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import remarkGfm from 'remark-gfm';
import { notifyError } from '../core/errors';
import { Heading } from './itinerary/Heading';
import { Item } from './itinerary/Item';
import 'highlight.js/styles/github.css';
import { DateTime } from 'luxon';
import Statistics from './itinerary/Statistics';

interface MarkdownPreviewProps {
    content: string;
    timezone?: string;
    currency?: string;
    stayMode?: 'default' | 'header';
    title?: string;
    summary?: {
        startDate?: string;
        endDate?: string;
        numDays?: number;
    };
    totalFormatted?: string | null;
    breakdownFormatted?: { transportation: string; activity: string; stay: string } | null;
    showPast?: boolean;
    scrollToRatio?: number;
    activeLine?: number;
    autoScroll?: boolean;
}

// Remove internal props passed by react-markdown that should not hit the DOM
const omitInternalProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const clean = { ...(props as Record<string, unknown>) } as Record<string, unknown> & {
        node?: unknown;
        sourcePosition?: unknown;
        index?: unknown;
        siblingCount?: unknown;
    };
    delete (clean as { node?: unknown }).node;
    delete (clean as { sourcePosition?: unknown }).sourcePosition;
    delete (clean as { index?: unknown }).index;
    delete (clean as { siblingCount?: unknown }).siblingCount;
    return clean as Record<string, unknown>;
};

const WarnEffect: React.FC<{ message?: string }> = ({ message }) => {
    React.useEffect(() => {
        if (message) notifyError(message);
    }, [message]);
    return null;
};

// Copy mdast position to hProperties for DOM usage without touching core plugin
function remarkPositionData() {
    return function transformer(tree: unknown) {
        const visit = (node: any) => {
            if (node && node.position && (node.position.start?.line || node.position.end?.line)) {
                node.data ||= {};
                node.data.hProperties ||= {};
                if (node.position.start?.line && node.data.hProperties['data-itin-line-start'] == null) {
                    node.data.hProperties['data-itin-line-start'] = String(node.position.start.line);
                }
                if (node.position.end?.line && node.data.hProperties['data-itin-line-end'] == null) {
                    node.data.hProperties['data-itin-line-end'] = String(node.position.end.line);
                }
            }
            const children = Array.isArray(node?.children) ? node.children : [];
            for (const child of children) visit(child);
        };
        visit(tree as any);
        return tree as unknown;
    };
}

const MarkdownPreviewComponent: FC<MarkdownPreviewProps> = ({ content, timezone, currency, stayMode = 'default', showPast, title, summary, totalFormatted, breakdownFormatted, activeLine, autoScroll = true }) => {
    const displayTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const getDataAttr = (rest: Record<string, unknown>, key: string): string | undefined => rest[key] as string | undefined;
    const tryParseJson = <T,>(str?: string): T | null => {
        if (!str) return null;
        try {
            return JSON.parse(str) as T;
        } catch {
            return null;
        }
    };

    // showPast をそのまま採用し、URL パラメータ依存は排除
    const showPastEffective = typeof showPast === 'boolean' ? showPast : true;

    const eventsCountByDate = React.useMemo(() => {
        try {
            const evts = parseItineraryEvents(content, { timezone, stayMode });
            const acc: Record<string, number> = {};
            for (const e of evts) {
                if (e.date) acc[e.date] = (acc[e.date] || 0) + 1;
            }
            return acc;
        } catch {
            return {} as Record<string, number>;
        }
    }, [content, timezone, stayMode]);

    const isPastDay = (isoDate: string, zoneOverride?: string): boolean => {
        const zone = isValidIanaTimeZone(zoneOverride || '') ? (zoneOverride as string) : displayTimezone;
        const day = DateTime.fromISO(isoDate, { zone }).startOf('day');
        const today = DateTime.now().setZone(zone).startOf('day');
        return day < today;
    };

    const shouldHideByDateAttr = (rest: Record<string, unknown>): boolean => {
        if (showPastEffective) return false;
        const dateStr = getDataAttr(rest, 'data-itin-date-str');
        const dateTz = getDataAttr(rest, 'data-itin-date-tz');
        if (!dateStr) return false;
        return isPastDay(dateStr, dateTz);
    };

    const safeSummary = summary ?? {};
    const safeTotalFormatted = totalFormatted ?? null;
    const safeBreakdownFormatted = breakdownFormatted ?? null;

    const { parsedFrontmatter, parsedBody } = React.useMemo(() => {
        try {
            const parsed = matter(content);
            return {
                parsedFrontmatter: parsed.data as Record<string, unknown>,
                parsedBody: parsed.content || '',
            };
        } catch {
            return { parsedFrontmatter: {} as Record<string, unknown>, parsedBody: content };
        }
    }, [content]);

    const frontmatterTz = typeof parsedFrontmatter?.timezone === 'string' ? (parsedFrontmatter.timezone as string) : undefined;
    React.useEffect(() => {
        if (frontmatterTz && !isValidIanaTimeZone(frontmatterTz)) {
            notifyError(`Frontmatter timezone "${frontmatterTz}" is invalid. Using fallback.`);
        }
    }, [frontmatterTz]);

    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // カーソル移動時のみスクロール（autoScroll 有効時）。ターゲットが可視ならスキップ
    React.useEffect(() => {
        if (!autoScroll) return;
        if (!activeLine || !containerRef.current) return;
        const container = containerRef.current;
        let nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-itin-line-start], [data-itin-line-end]'));
        // Fallback: remarkのdata属性が無い場合、react-markdownのdata-sourceposを利用
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
            // data-sourcepos="sL:sC-eL:eC" 形式のとき
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
        // 上下に少し余白を持たせた可視判定
        const margin = 8;
        const visible = tRect.bottom > cRect.top + margin && tRect.top < cRect.bottom - margin;
        if (visible) return;
        const delta = tRect.top - cRect.top - container.clientHeight / 2 + tRect.height / 2;
        container.scrollBy({ top: delta, behavior: 'smooth' });
    }, [activeLine, autoScroll]);

    return (
        <div ref={containerRef} className="markdown-preview h-full px-8 py-4 bg-white overflow-auto">
            {title && <h1>{title}</h1>}
            <Statistics summary={safeSummary} totalFormatted={safeTotalFormatted} breakdownFormatted={safeBreakdownFormatted} />
            <ReactMarkdown
                remarkPlugins={[[remarkItinerary, { timezone, stayMode, frontmatter: parsedFrontmatter }], remarkGfm, remarkPositionData]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    h2: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode }) || {};
                        const dataItinDate = getDataAttr(rest as Record<string, unknown>, 'data-itin-date');
                        const warnHeadingTz = getDataAttr(rest as Record<string, unknown>, 'data-itin-warn-date-tz');
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        const parsed = tryParseJson<{
                            date: string;
                            timezone?: string;
                            originalText: string;
                            prevStayName?: string;
                        }>(dataItinDate);
                        if (parsed) {
                            if (!showPastEffective && isPastDay(parsed.date, parsed.timezone)) {
                                const cnt = eventsCountByDate[parsed.date] || 0;
                                return (
                                    <div className="flex items-center text-gray-500 text-xs mt-6 mb-4" {...(cleanRest as React.HTMLAttributes<HTMLDivElement>)}>
                                        <span className="flex-1 border-t border-gray-200" />
                                        <span className="px-2">{cnt} past events hidden</span>
                                        <span className="flex-1 border-t border-gray-200" />
                                    </div>
                                );
                            }
                            return (
                                <div className="contents" {...(cleanRest as React.HTMLAttributes<HTMLDivElement>)}>
                                    <WarnEffect message={warnHeadingTz ? `Heading timezone "${warnHeadingTz}" is invalid. Using fallback.` : undefined} />
                                    <Heading date={parsed.date} timezone={parsed.timezone} prevStayName={stayMode === 'header' ? parsed.prevStayName : undefined} />
                                </div>
                            );
                        }
                        return (
                            <h2 {...(cleanRest as React.HTMLAttributes<HTMLHeadingElement>)} className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6">
                                {children}
                            </h2>
                        );
                    },
                    p: (props: unknown) => {
                        type ParagraphRendererProps = {
                            children?: React.ReactNode;
                        } & Record<string, unknown>;
                        const { children, ...rest } = (props as ParagraphRendererProps) || ({} as ParagraphRendererProps);
                        const skip = getDataAttr(rest as Record<string, unknown>, 'data-itin-skip');
                        const eventStr = getDataAttr(rest as Record<string, unknown>, 'data-itin-event');
                        const dateStr = getDataAttr(rest as Record<string, unknown>, 'data-itin-date-str');
                        const dateTz = getDataAttr(rest as Record<string, unknown>, 'data-itin-date-tz');
                        const warnEventTz = getDataAttr(rest as Record<string, unknown>, 'data-itin-warn-event-tz');
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        if (skip === '1') return null;
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const rawEvent = tryParseJson<unknown>(eventStr);
                        if (rawEvent && typeof rawEvent === 'object') {
                            const warnMessage = (() => {
                                if (!warnEventTz) return undefined;
                                try {
                                    const arr = JSON.parse(warnEventTz) as string[];
                                    if (Array.isArray(arr) && arr.length > 0) {
                                        return `Event timezone(s) invalid: ${arr.join(', ')}. Using fallback.`;
                                    }
                                } catch {}
                                return undefined;
                            })();
                            const r = rawEvent as {
                                timeRange?: {
                                    start?: { dateTime?: unknown };
                                    end?: { dateTime?: unknown };
                                };
                            };

                            if (r.timeRange?.start?.dateTime && typeof r.timeRange.start.dateTime === 'string') {
                                r.timeRange.start.dateTime = new Date(r.timeRange.start.dateTime);
                            }
                            if (r.timeRange?.end?.dateTime && typeof r.timeRange.end.dateTime === 'string') {
                                r.timeRange.end.dateTime = new Date(r.timeRange.end.dateTime);
                            }
                            const eventData = r as Parameters<typeof Item>[0]['eventData'];
                            return (
                                <div className="contents" {...(cleanRest as React.HTMLAttributes<HTMLDivElement>)}>
                                    <WarnEffect message={warnMessage} />
                                    <Item eventData={eventData} dateStr={dateStr} timezone={displayTimezone} currency={currency} />
                                </div>
                            );
                        }
                        return (
                            <p {...(cleanRest as React.HTMLAttributes<HTMLParagraphElement>)} className="mb-4 leading-relaxed text-gray-800 ml-20">
                                {children}
                            </p>
                        );
                    },
                    ul: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <ul {...(cleanRest as React.HTMLAttributes<HTMLUListElement>)}>{children}</ul>;
                    },
                    ol: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <ol {...(cleanRest as React.HTMLAttributes<HTMLOListElement>)}>{children}</ol>;
                    },
                    li: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <li {...(cleanRest as React.HTMLAttributes<HTMLLIElement>)}>{children}</li>;
                    },
                    blockquote: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <blockquote {...(cleanRest as React.HTMLAttributes<HTMLQuoteElement>)}>{children}</blockquote>;
                    },
                    table: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <table {...(cleanRest as React.HTMLAttributes<HTMLTableElement>)}>{children}</table>;
                    },
                    pre: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode } & Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <pre {...(cleanRest as React.HTMLAttributes<HTMLPreElement>)}>{children}</pre>;
                    },
                    hr: (props: unknown) => {
                        const { ...rest } = (props as Record<string, unknown>) || {};
                        if (shouldHideByDateAttr(rest as Record<string, unknown>)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <hr {...(cleanRest as React.HTMLAttributes<HTMLHRElement>)} />;
                    },
                }}
            >
                {parsedBody}
            </ReactMarkdown>
        </div>
    );
};

export const MarkdownPreview = memo(MarkdownPreviewComponent);
