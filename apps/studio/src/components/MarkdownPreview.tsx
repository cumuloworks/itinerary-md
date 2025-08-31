import { remarkItinerary } from '@itinerary-md/core';
import matter from 'gray-matter';
import React, { type FC, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import remarkGfm from 'remark-gfm';
import { Heading } from './itinerary/Heading';
import { Item } from './itinerary/Item';
import 'highlight.js/styles/github.css';
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
    breakdownFormatted?: { transport: string; activity: string; meal: string } | null;
}

const MarkdownPreviewComponent: FC<MarkdownPreviewProps> = ({ content, timezone, currency, stayMode = 'default', title, summary, totalFormatted, breakdownFormatted }) => {
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

    return (
        <div className="markdown-preview h-full px-8 py-4 bg-white overflow-auto">
            {title && <h1>{title}</h1>}
            <Statistics summary={safeSummary} totalFormatted={safeTotalFormatted} breakdownFormatted={safeBreakdownFormatted} />
            <ReactMarkdown
                remarkPlugins={[[remarkItinerary, { timezone, stayMode, frontmatter: parsedFrontmatter }], remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    h2: (props: unknown) => {
                        const { children, ...rest } = (props as { children?: React.ReactNode }) || {};
                        const dataItinDate = getDataAttr(rest as Record<string, unknown>, 'data-itin-date');
                        const parsed = tryParseJson<{
                            date: string;
                            timezone?: string;
                            originalText: string;
                            prevStayName?: string;
                        }>(dataItinDate);
                        if (parsed) {
                            return <Heading date={parsed.date} timezone={parsed.timezone} prevStayName={stayMode === 'header' ? parsed.prevStayName : undefined} />;
                        }
                        return (
                            <h2 {...(rest as React.HTMLAttributes<HTMLHeadingElement>)} className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6">
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
                        if (skip === '1') return null;
                        const rawEvent = tryParseJson<unknown>(eventStr);
                        if (rawEvent && typeof rawEvent === 'object') {
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
                            return <Item eventData={eventData} dateStr={dateStr} timezone={displayTimezone} currency={currency} />;
                        }
                        return (
                            <p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)} className="mb-4 leading-relaxed text-gray-800 ml-20">
                                {children}
                            </p>
                        );
                    },
                }}
            >
                {parsedBody}
            </ReactMarkdown>
        </div>
    );
};

export const MarkdownPreview = memo(MarkdownPreviewComponent);
