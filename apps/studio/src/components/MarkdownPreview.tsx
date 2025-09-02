import { isValidIanaTimeZone, parseItineraryEvents, remarkItinerary } from '@itinerary-md/core';
import matter from 'gray-matter';
import React, { type FC, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import remarkGfm from 'remark-gfm';
import { notifyError } from '../core/errors';
import { isAllowedHref, isAllowedImageSrc, isExternalHttpUrl } from '../utils/url';
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

type MdAstNode = {
    position?: { start?: { line?: number }; end?: { line?: number } };
    data?: { hProperties?: Record<string, unknown> };
    children?: MdAstNode[];
};

function remarkPositionData() {
    return function transformer(tree: unknown) {
        const visit = (node: MdAstNode | undefined) => {
            if (node?.position && (node.position.start?.line || node.position.end?.line)) {
                node.data ||= {};
                node.data.hProperties ||= {};
                if (node.position.start?.line && node.data.hProperties['data-itin-line-start'] == null) {
                    node.data.hProperties['data-itin-line-start'] = String(node.position.start.line);
                }
                if (node.position.end?.line && node.data.hProperties['data-itin-line-end'] == null) {
                    node.data.hProperties['data-itin-line-end'] = String(node.position.end.line);
                }
            }
            const children: MdAstNode[] = Array.isArray(node?.children) ? (node?.children as MdAstNode[]) : [];
            for (const child of children) visit(child);
        };
        visit(tree as MdAstNode);
        return tree as unknown;
    };
}

const MarkdownPreviewComponent: FC<MarkdownPreviewProps> = ({ content, timezone, currency, stayMode = 'default', showPast, title, summary, totalFormatted, breakdownFormatted, activeLine, autoScroll = true }) => {
    const displayTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const showPastEffective = typeof showPast === 'boolean' ? showPast : true;

    const eventsCountByDate = React.useMemo(() => {
        try {
            const evts = parseItineraryEvents(content, { timezone, stayMode });
            const acc: Record<string, number> = {};
            for (const e of evts) {
                const skipped = (e as unknown as { skip?: boolean })?.skip === true;
                if (skipped) continue;
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
            {title && <h1>{title}</h1>}
            <Statistics summary={safeSummary} totalFormatted={safeTotalFormatted} breakdownFormatted={safeBreakdownFormatted} />
            <ReactMarkdown
                remarkPlugins={[[remarkItinerary, { timezone, stayMode, frontmatter: parsedFrontmatter, debug: true }], remarkGfm, remarkPositionData]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    a: (props: unknown) => {
                        const { href, children, ...rest } = (props as { href?: string; children?: React.ReactNode } & Record<string, unknown>) || {};
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        if (!isAllowedHref(href)) {
                            return (
                                <span {...(cleanRest as React.HTMLAttributes<HTMLSpanElement>)} className="text-gray-500 underline decoration-dotted cursor-not-allowed" aria-disabled="true">
                                    {children}
                                </span>
                            );
                        }
                        const external = typeof href === 'string' && isExternalHttpUrl(href);
                        const rel = external ? 'noopener noreferrer' : undefined;
                        const target = external ? '_blank' : undefined;
                        return (
                            <a {...(cleanRest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href={href} target={target} rel={rel} className="underline">
                                {children}
                            </a>
                        );
                    },
                    img: (props: unknown) => {
                        const { src, alt, ...rest } = (props as { src?: string; alt?: string } & Record<string, unknown>) || {};
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        if (!isAllowedImageSrc(src)) {
                            return <span {...(cleanRest as React.HTMLAttributes<HTMLSpanElement>)} aria-hidden="true" />;
                        }
                        return <img {...(cleanRest as React.ImgHTMLAttributes<HTMLImageElement>)} src={src} alt={typeof alt === 'string' ? alt : ''} loading="lazy" referrerPolicy="no-referrer" />;
                    },
                    h2: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date'?: string }) || {};
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        const itinDateStr = (rest as { 'data-itin-date'?: string })['data-itin-date'];
                        let itmdHeading: { date: string; timezone?: string; prevStayName?: string; warnInvalidTimezone?: string } | undefined;
                        if (itinDateStr) {
                            try {
                                itmdHeading = JSON.parse(itinDateStr);
                            } catch (e) {}
                        }
                        if (itmdHeading && typeof itmdHeading.date === 'string') {
                            if (!showPastEffective && isPastDay(itmdHeading.date, itmdHeading.timezone)) {
                                const cnt = eventsCountByDate[itmdHeading.date] || 0;
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
                                    <WarnEffect message={itmdHeading.warnInvalidTimezone ? `Heading timezone "${itmdHeading.warnInvalidTimezone}" is invalid. Using fallback.` : undefined} />
                                    <Heading date={itmdHeading.date} timezone={itmdHeading.timezone} prevStayName={stayMode === 'header' ? itmdHeading.prevStayName : undefined} />
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
                            node?: unknown;
                            'data-itmd'?: string;
                            'data-itmd-skip'?: string;
                            'data-itin-date-str'?: string;
                            'data-itin-date-tz'?: string;
                        } & Record<string, unknown>;
                        const { children, node, ...rest } = (props as ParagraphRendererProps) || ({} as ParagraphRendererProps);
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);

                        const itmdJsonStr = (rest as ParagraphRendererProps)['data-itmd'];
                        const skipFlag = (rest as ParagraphRendererProps)['data-itmd-skip'] === 'true';
                        const dateStr = (rest as ParagraphRendererProps)['data-itin-date-str'];
                        const dateTz = (rest as ParagraphRendererProps)['data-itin-date-tz'];

                        let itmdObj:
                            | {
                                  eventData?: Parameters<typeof Item>[0]['eventData'];
                                  dateStr?: string;
                                  dateTz?: string;
                                  nameSegments?: Array<{ text: string; url?: string }>;
                                  departureSegments?: Array<{ text: string; url?: string }>;
                                  arrivalSegments?: Array<{ text: string; url?: string }>;
                                  extraLinks?: Array<{ label: string; url: string }>;
                                  warnEventTz?: string[];
                              }
                            | undefined;

                        if (itmdJsonStr) {
                            try {
                                itmdObj = JSON.parse(itmdJsonStr);
                            } catch (e) {}
                        }

                        const effectiveDateStr = itmdObj?.dateStr || dateStr;
                        const effectiveDateTz = itmdObj?.dateTz || dateTz;

                        if (skipFlag) return null;
                        if (!showPastEffective && effectiveDateStr && isPastDay(effectiveDateStr, effectiveDateTz)) return null;
                        if (itmdObj?.eventData) {
                            const warnMessage = (() => {
                                const arr = itmdObj?.warnEventTz;
                                if (Array.isArray(arr) && arr.length > 0) {
                                    return `Event timezone(s) invalid: ${arr.join(', ')}. Using fallback.`;
                                }
                                return undefined;
                            })();

                            const eventData = itmdObj.eventData as Parameters<typeof Item>[0]['eventData'];
                            return (
                                <div className="contents" {...(cleanRest as React.HTMLAttributes<HTMLDivElement>)}>
                                    <WarnEffect message={warnMessage} />
                                    <Item
                                        eventData={eventData}
                                        dateStr={effectiveDateStr}
                                        timezone={displayTimezone}
                                        currency={currency}
                                        nameSegments={itmdObj.nameSegments}
                                        departureSegments={itmdObj.departureSegments}
                                        arrivalSegments={itmdObj.arrivalSegments}
                                        extraLinks={itmdObj.extraLinks}
                                    />
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
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <ul {...(cleanRest as React.HTMLAttributes<HTMLUListElement>)}>{children}</ul>;
                    },
                    ol: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <ol {...(cleanRest as React.HTMLAttributes<HTMLOListElement>)}>{children}</ol>;
                    },
                    li: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <li {...(cleanRest as React.HTMLAttributes<HTMLLIElement>)}>{children}</li>;
                    },
                    blockquote: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <blockquote {...(cleanRest as React.HTMLAttributes<HTMLQuoteElement>)}>{children}</blockquote>;
                    },
                    table: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <table {...(cleanRest as React.HTMLAttributes<HTMLTableElement>)}>{children}</table>;
                    },
                    pre: (props: unknown) => {
                        const { children, node, ...rest } = (props as { children?: React.ReactNode; node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
                        const cleanRest = omitInternalProps(rest as Record<string, unknown>);
                        return <pre {...(cleanRest as React.HTMLAttributes<HTMLPreElement>)}>{children}</pre>;
                    },
                    hr: (props: unknown) => {
                        const { node, ...rest } = (props as { node?: unknown; 'data-itin-date-str'?: string; 'data-itin-date-tz'?: string } & Record<string, unknown>) || {};
                        const dateStr = (rest as { 'data-itin-date-str'?: string })['data-itin-date-str'];
                        const dateTz = (rest as { 'data-itin-date-tz'?: string })['data-itin-date-tz'];
                        if (!showPastEffective && dateStr && isPastDay(dateStr, dateTz)) return null;
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
