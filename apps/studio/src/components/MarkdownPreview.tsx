import { remarkItinerary } from '@itinerary-md/core';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkExtractFrontmatter from 'remark-extract-frontmatter';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import YAML from 'yaml';
import { Heading } from './itinerary/Heading';
import { Item } from './itinerary/Item';
import 'highlight.js/styles/github.css';

interface MarkdownPreviewProps {
    content: string;
    baseTz?: string;
    currency?: string;
    stayMode?: 'default' | 'header';
    title?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, baseTz, currency, stayMode = 'default', title }) => {
    const displayBaseTz = baseTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const getDataAttr = (rest: Record<string, unknown>, key: string): string | undefined => rest[key] as string | undefined;

    const tryParseJson = <T,>(str?: string): T | null => {
        if (!str) return null;
        try {
            return JSON.parse(str) as T;
        } catch {
            return null;
        }
    };

    return (
        <div className="markdown-preview h-full px-8 py-4 border border-gray-300 bg-white overflow-auto">
            {title && <h1>{title}</h1>}
            <ReactMarkdown
                remarkPlugins={[remarkFrontmatter, [remarkExtractFrontmatter, { yaml: YAML.parse, name: 'frontmatter' }], [remarkItinerary, { baseTz, stayMode }], remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
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
                            <h2 {...(rest as React.HTMLAttributes<HTMLHeadingElement>)} className="text-blue-600 border-b-2 border-gray-200 pb-2 mt-6 mb-4">
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
                            return <Item eventData={eventData} dateStr={dateStr} baseTz={displayBaseTz} currency={currency} />;
                        }
                        return (
                            <p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)} className="mb-4 leading-relaxed text-gray-800 ml-20">
                                {children}
                            </p>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
