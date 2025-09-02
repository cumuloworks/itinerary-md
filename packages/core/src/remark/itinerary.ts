import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { parseDateText } from '../parser/parsers/date';
import { parseEvent, parseTimeAndType } from '../parser/parsers/event';
import { isValidIanaTimeZone } from '../time/iana';
//

export type StayMode = 'default' | 'header';

type Options = { timezone?: string; stayMode?: StayMode; frontmatter?: Record<string, unknown> };

type MdNode = {
    type?: string;
    children?: MdNode[];
    value?: unknown;
    data?: Record<string, unknown> | undefined;
    position?: { start?: { line?: number; column?: number }; end?: { line?: number; column?: number } };
};

export const remarkItinerary: Plugin<[Options?], Root> = (options?: Options) => {
    return function transformer(tree: Root, file?: VFile) {
        if (!tree) return tree;

        let frontmatterTimezone: string | undefined;
        let isItinerary = true;
        const normalizeFrontmatterMinimal = (raw: Record<string, unknown>): { isItinerary: boolean; timezone?: string } => {
            const getString = (val: unknown): string | undefined => (typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined);
            const typeRaw = getString((raw as Record<string, unknown>)['type']);
            const typeLc = typeRaw ? typeRaw.toLowerCase() : undefined;
            const isItin = typeLc === 'itinerary-md' || typeLc === 'itmd' || typeLc === 'tripmd';
            const tzRaw = getString((raw as Record<string, unknown>)['timezone']);
            const timezone = isValidIanaTimeZone(tzRaw) ? tzRaw : undefined;
            return { isItinerary: isItin, timezone };
        };
        {
            const fmRaw = (options?.frontmatter as unknown) ?? (file?.data?.frontmatter as unknown);
            if (fmRaw && typeof fmRaw === 'object' && !Array.isArray(fmRaw)) {
                const normalized = normalizeFrontmatterMinimal(fmRaw as Record<string, unknown>);
                isItinerary = normalized.isItinerary;
                if (normalized.timezone) frontmatterTimezone = normalized.timezone;
            }
        }

        if (!isItinerary) return tree;

        // Accept any metadata key in the immediate following top-level list (key: value)

        const root = (tree as { children?: MdNode[] }) ?? {};
        const children: MdNode[] = Array.isArray(root.children) ? root.children : [];

        let previousEvent: ReturnType<typeof parseEvent> | null = null;
        let currentDateStr: string | undefined;
        let currentDateTz: string | undefined;
        let lastStayName: string | undefined;
        let prevDayHadStay = false;
        let currentDayHasStay = false;

        for (let i = 0; i < children.length; i += 1) {
            const para = children[i];
            if (!para) continue;

            if (para.type === 'heading' && (para as unknown as { depth?: number }).depth === 2) {
                const line = mdastToString(para as MdNode).trim();
                const dateData = parseDateText(line, isValidIanaTimeZone(frontmatterTimezone) ? frontmatterTimezone : options?.timezone);
                if (dateData) {
                    prevDayHadStay = currentDayHasStay;
                    currentDayHasStay = false;
                    previousEvent = null;
                    currentDateStr = dateData.date;
                    currentDateTz = dateData.timezone;
                    const prevData = para.data || {};
                    const prevH = (prevData.hProperties as Record<string, unknown>) || {};
                    const hProps: Record<string, unknown> = { ...prevH };
                    hProps['data-itin-date'] = JSON.stringify({ ...dateData, prevStayName: prevDayHadStay ? lastStayName || undefined : undefined });
                    const tzInHeading = (() => {
                        const m = line.match(/@\s*([A-Za-z0-9_./+-]+)/);
                        return m?.[1];
                    })();
                    if (tzInHeading && !isValidIanaTimeZone(tzInHeading)) {
                        hProps['data-itin-warn-date-tz'] = tzInHeading;
                    }
                    para.data = { ...prevData, hProperties: hProps } as MdNode['data'];
                }
                continue;
            }

            // Attach current date attributes to any non-heading node within the day's section
            if (currentDateStr) {
                const prevData = para.data || {};
                const prevH = (prevData.hProperties as Record<string, unknown>) || {};
                const hProps: Record<string, unknown> = { ...prevH };
                if (!hProps['data-itin-date-str']) hProps['data-itin-date-str'] = currentDateStr;
                if (currentDateTz && !hProps['data-itin-date-tz']) hProps['data-itin-date-tz'] = currentDateTz;
                para.data = { ...prevData, hProperties: hProps } as MdNode['data'];
            }

            if (para.type !== 'paragraph') continue;

            // Use full paragraph text to include link texts and inline nodes for parsing
            const firstLineText = mdastToString(para as MdNode).trim();

            const parsed = parseTimeAndType(firstLineText, frontmatterTimezone);
            if (!parsed) continue;

            const mainText = parsed.eventDescription;
            const mergedMeta: Record<string, string> = {};
            const notes: string[] = [];

            const source = String(file?.value ?? '');
            const lines = source.split(/\r?\n/);
            const nextNode = children[i + 1] as MdNode | undefined;
            const nextCol = (nextNode?.position?.start?.column ?? 1) as number;
            if (nextNode && nextNode.type === 'list' && nextCol === 1 && Array.isArray(nextNode.children)) {
                const listNode = nextNode as unknown as { type: string; ordered?: boolean; children: MdNode[] };
                const remainingItems: MdNode[] = [];
                const liftedNodes: MdNode[] = [];

                const getFirstParagraphText = (item: MdNode): string => {
                    const kids = Array.isArray(item.children) ? item.children : [];
                    const firstPara = kids.find((n) => n?.type === 'paragraph') as MdNode | undefined;
                    const raw = firstPara ? mdastToString(firstPara as MdNode) : mdastToString(item as MdNode);
                    return (
                        String(raw || '')
                            .split(/\r?\n/)[0]
                            ?.trim() || ''
                    );
                };

                let consumeCount = 0;
                for (let idx = 0; idx < listNode.children.length; idx += 1) {
                    const li = listNode.children[idx] as MdNode;
                    if (idx === 0) {
                        consumeCount = 1;
                        continue;
                    }
                    const prev = listNode.children[idx - 1] as MdNode;
                    const prevEnd = (prev?.position?.end?.line ?? 0) as number;
                    const curStart = (li?.position?.start?.line ?? 0) as number;
                    let hasBlank = false;
                    for (let ln = prevEnd; ln < curStart - 1; ln += 1) {
                        const raw = lines[ln] ?? '';
                        if (raw.trim() === '') {
                            hasBlank = true;
                            break;
                        }
                    }
                    if (hasBlank) break;
                    consumeCount += 1;
                }

                for (let idx = 0; idx < listNode.children.length; idx += 1) {
                    const li = listNode.children[idx] as MdNode;
                    const isConsumed = idx < consumeCount;
                    const text = getFirstParagraphText(li);
                    const colonIndex = text.indexOf(':');
                    if (isConsumed && colonIndex > 0) {
                        const key = text.substring(0, colonIndex).trim().toLowerCase();
                        const value = text.substring(colonIndex + 1).trim();
                        mergedMeta[key] = value;

                        // If the value part contains a markdown link, keep its URL alongside the value
                        try {
                            const liChildren = (li as MdNode).children;
                            const firstPara = Array.isArray(liChildren) ? (liChildren.find((n) => n?.type === 'paragraph') as MdNode | undefined) : undefined;
                            const findFirstLink = (node?: MdNode): string | undefined => {
                                if (!node) return undefined;
                                const kids = Array.isArray(node.children) ? node.children : [];
                                for (const child of kids) {
                                    if (!child) continue;
                                    if ((child as { type?: string }).type === 'link') {
                                        const url = (child as unknown as { url?: string }).url;
                                        if (typeof url === 'string' && url.trim() !== '') return url;
                                    }
                                    const nested = findFirstLink(child as MdNode);
                                    if (nested) return nested;
                                }
                                return undefined;
                            };
                            const url = findFirstLink(firstPara);
                            if (url) {
                                mergedMeta[`${key}__url`] = url;
                            }
                            const sublists = Array.isArray(liChildren) ? liChildren.filter((n) => n?.type === 'list') : [];
                            liftedNodes.push(...sublists);
                        } catch {
                            // no-op on link extraction failure
                        }
                        continue;
                    }
                    remainingItems.push(li);
                }

                if (remainingItems.length > 0) {
                    (listNode.children as MdNode[]) = remainingItems;
                    if (liftedNodes.length > 0) {
                        children.splice(i + 2, 0, ...liftedNodes);
                    }
                } else {
                    children.splice(i + 1, 1, ...liftedNodes);
                }
            }

            if (notes.length > 0) {
                const current = mergedMeta.note || mergedMeta.text || '';
                const parts = [...(current ? current.split(' / ') : []), ...notes].map((s) => s.trim()).filter(Boolean);
                const unique = Array.from(new Set(parts));
                mergedMeta.note = unique.join(' / ');
            }

            const rebuilt = `${parsed.timeRange?.originalText ? `${parsed.timeRange.originalText} ` : ''}${parsed.type} ${mainText}`;
            const prevData = para.data || {};
            const prevH = (prevData.hProperties as Record<string, unknown>) || {};
            const itinMeta: Record<string, string> = { ...mergedMeta };
            const hProps: Record<string, unknown> = { ...prevH };
            hProps['data-itin-meta'] = JSON.stringify(itinMeta);
            if (parsed.timeRange?.originalText) {
                const tzTokens = Array.from(parsed.timeRange.originalText.matchAll(/@([A-Za-z0-9_./+-]+)/g)).map((m) => m[1]);
                const invalids = tzTokens.filter((z) => !isValidIanaTimeZone(z));
                if (invalids.length > 0) {
                    hProps['data-itin-warn-event-tz'] = JSON.stringify(Array.from(new Set(invalids)));
                }
            }

            // Collect link texts in this paragraph for later association (e.g., flight code, airport)
            const collectLinks = (node?: MdNode, acc?: Record<string, string>): Record<string, string> => {
                const out = acc || {};
                if (!node) return out;
                const kids = Array.isArray(node.children) ? node.children : [];
                for (const child of kids) {
                    if (!child) continue;
                    if ((child as { type?: string }).type === 'link') {
                        const url = (child as unknown as { url?: string }).url;
                        const label = mdastToString(child as MdNode).trim();
                        if (label && typeof url === 'string' && url.trim() !== '' && !out[label]) {
                            out[label] = url;
                        }
                    }
                    collectLinks(child as MdNode, out);
                }
                return out;
            };
            const linkMap = collectLinks(para as MdNode, {});

            const parseTimezone = currentDateTz && isValidIanaTimeZone(currentDateTz) ? currentDateTz : isValidIanaTimeZone(frontmatterTimezone) ? frontmatterTimezone : options?.timezone;
            const eventData = parseEvent(rebuilt, previousEvent || undefined, parseTimezone, currentDateStr);
            if (eventData) {
                // Attach URL metadata based on label matching
                const urlEnhancedMeta: Record<string, string> = { ...itinMeta };
                if ('name' in eventData && eventData.name && linkMap[eventData.name]) {
                    urlEnhancedMeta['name__url'] = linkMap[eventData.name];
                }
                if ('departure' in eventData && eventData.departure && linkMap[eventData.departure]) {
                    urlEnhancedMeta['departure__url'] = linkMap[eventData.departure];
                }
                if ('arrival' in eventData && eventData.arrival && linkMap[eventData.arrival]) {
                    urlEnhancedMeta['arrival__url'] = linkMap[eventData.arrival];
                }

                const mergedEvent = { ...eventData, metadata: { ...eventData.metadata, ...urlEnhancedMeta } } as typeof eventData;
                if (options?.stayMode === 'header' && mergedEvent.type === 'stay') {
                    if (mergedEvent.stayName) {
                        lastStayName = mergedEvent.stayName;
                        currentDayHasStay = true;
                    }
                    hProps['data-itin-skip'] = '1';
                } else {
                    if (mergedEvent.type === 'stay' && mergedEvent.stayName) {
                        lastStayName = mergedEvent.stayName;
                        currentDayHasStay = true;
                    }
                }
                previousEvent = mergedEvent;
                hProps['data-itin-event'] = JSON.stringify(mergedEvent);
                if (currentDateStr) hProps['data-itin-date-str'] = currentDateStr;
                if (currentDateTz) hProps['data-itin-date-tz'] = currentDateTz;
            }

            para.data = { ...prevData, itinMeta, hProperties: hProps } as MdNode['data'];

            // Preserve original paragraph children to keep Markdown structures (e.g., links)
            // Do not overwrite para.children with a rebuilt plain text
        }
        return tree;
    };
};
