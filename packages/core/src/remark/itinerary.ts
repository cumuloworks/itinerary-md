import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { parseDateText } from '../parser/parsers/date';
import { parseEvent, parseTimeAndType } from '../parser/parsers/event';
import type { EventData } from '../parser/parsers/event';
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
    url?: string;
};

type TextSegment = {
    text: string;
    url?: string;
};

export const remarkItinerary: Plugin<[Options?], Root> = (options?: Options) => {
    return function transformer(tree: Root, file?: VFile) {
        if (!tree) return tree;



                const nodeToSegments = (node: MdNode): TextSegment[] => {
            const segments: TextSegment[] = [];
            
            if (node.type === 'text' && typeof node.value === 'string') {
                segments.push({ text: node.value });
            } else if (node.type === 'link') {
                                const linkText = mdastToString(node);
                const url = node.url || "";

                segments.push({ text: linkText, url });
            } else if (node.children) {
                for (const child of node.children) {
                    segments.push(...nodeToSegments(child));
                }
            }
            
            return segments;
        };

                const segmentsToPlainText = (segments: TextSegment[]): string => {
            return segments.map(s => s.text).join('');
        };

                const parseEventFromSegments = (
            segments: TextSegment[],
            context?: EventData | null,
            timezone?: string,
            baseDate?: string
        ): { eventData: EventData | null; nameSegments?: TextSegment[]; departureSegments?: TextSegment[]; arrivalSegments?: TextSegment[] } | null => {
            const plainText = segmentsToPlainText(segments);
            const parsed = parseTimeAndType(plainText, timezone, baseDate);
            if (!parsed) return null;

                        const timeMatch = plainText.match(/^(\[(?:[\d:+@A-Za-z_/-]+|)\](?:\s*-\s*\[(?:[\d:+@A-Za-z_/-]+|)\])?)\s+(\w+)\s*/);
            if (!timeMatch) return null;
            
            const timeAndTypeLength = timeMatch[0].length;
            
                        let currentLength = 0;
            let descriptionStartIndex = 0;
            
            for (let i = 0; i < segments.length; i++) {
                const segmentLength = segments[i].text.length;
                if (currentLength + segmentLength >= timeAndTypeLength) {
                                        const splitPoint = timeAndTypeLength - currentLength;
                    if (splitPoint > 0 && splitPoint < segmentLength) {
                                                const beforeText = segments[i].text.substring(0, splitPoint);
                        const afterText = segments[i].text.substring(splitPoint);
                        
                                                const newSegments: TextSegment[] = [];
                                                for (let j = 0; j < i; j++) {
                            newSegments.push(segments[j]);
                        }
                                                if (beforeText) {
                            newSegments.push({ text: beforeText, url: segments[i].url });
                        }
                                                if (afterText) {
                            newSegments.push({ text: afterText, url: segments[i].url });
                        }
                                                for (let j = i + 1; j < segments.length; j++) {
                            newSegments.push(segments[j]);
                        }
                        
                        segments = newSegments;
                        descriptionStartIndex = i + (beforeText ? 1 : 0);
                    } else if (splitPoint === 0) {
                        descriptionStartIndex = i;
                    } else {
                        descriptionStartIndex = i + 1;
                    }
                    break;
                }
                currentLength += segmentLength;
            }
            
            const descriptionSegments = segments.slice(descriptionStartIndex);
            const eventDescription = segmentsToPlainText(descriptionSegments);
            
                        const eventData = parseEvent(plainText, context || undefined, timezone, baseDate);

            if (!eventData) return null;
            
                        const result: { eventData: EventData | null; nameSegments?: TextSegment[]; departureSegments?: TextSegment[]; arrivalSegments?: TextSegment[] } = { eventData };
            
                        const displayName = ('name' in eventData && eventData.name) ? eventData.name 
                              : ('stayName' in eventData && eventData.stayName) ? eventData.stayName 
                              : null;
            
            if (displayName) {

                
                                if (eventDescription.includes('::')) {
                    const parts = eventDescription.split('::');
                    const namePartText = parts[0].trim();
                    result.nameSegments = extractSegmentsForText(descriptionSegments, namePartText);
                    
                    if ('departure' in eventData && 'arrival' in eventData && parts[1]) {
                                                const routeText = parts[1].trim();
                        const routeParts = routeText.split(' - ');
                        if (routeParts.length >= 2) {
                            const depText = routeParts[0].trim();
                            const arrText = routeParts[routeParts.length - 1].trim();
                            result.departureSegments = extractSegmentsForText(descriptionSegments, depText, namePartText.length + 4);                             result.arrivalSegments = extractSegmentsForText(descriptionSegments, arrText, namePartText.length + 4 + depText.length + 3);                         }
                    } else if (('location' in eventData && eventData.location) || eventData.baseType === 'stay') {
                                                const locationText = parts[1].trim();
                        result.arrivalSegments = extractSegmentsForText(descriptionSegments, locationText, namePartText.length + 4);                     }
                } else {
                                        const atMatch = eventDescription.match(/^(.+?)\s+at\s+(.+)$/);
                    const atOnlyMatch = eventDescription.match(/^at\s+(.+)$/);
                    
                    if (atMatch) {
                                                const namePartText = atMatch[1].trim();
                        if (namePartText) {
                            result.nameSegments = extractSegmentsForText(descriptionSegments, namePartText);
                            
                                                        if (('location' in eventData && eventData.location) || eventData.baseType === 'stay') {
                                const locationText = atMatch[2].trim();
                                result.arrivalSegments = extractSegmentsForText(descriptionSegments, locationText, namePartText.length + 4);                             }
                        } else {
                            result.nameSegments = descriptionSegments;
                        }
                    } else if (atOnlyMatch && displayName) {
                                                result.nameSegments = [{ text: displayName }];
                        
                                                if (('location' in eventData && eventData.location) || eventData.baseType === 'stay') {
                            const locationText = atOnlyMatch[1].trim();
                            result.arrivalSegments = extractSegmentsForText(descriptionSegments, locationText, 3);                         }
                    } else {
                        result.nameSegments = descriptionSegments;
                    }
                }
            }
            
            return result;
        };

                const extractSegmentsForText = (segments: TextSegment[], targetText: string, startOffset = 0): TextSegment[] => {
            const result: TextSegment[] = [];
            let currentPos = 0;
            let targetStart = -1;
            let targetEnd = -1;
            
            const fullText = segmentsToPlainText(segments);
            
                        const searchStart = Math.max(0, startOffset);
            const searchText = fullText.substring(searchStart);
            const relativeIndex = searchText.indexOf(targetText);
            
            if (relativeIndex === -1) {
                return [];             }
            
            targetStart = searchStart + relativeIndex;
            targetEnd = targetStart + targetText.length;
            
                        for (const segment of segments) {
                const segmentLength = segment.text.length;
                const segmentEnd = currentPos + segmentLength;
                
                if (segmentEnd > targetStart && currentPos < targetEnd) {
                                        const overlapStart = Math.max(0, targetStart - currentPos);
                    const overlapEnd = Math.min(segmentLength, targetEnd - currentPos);
                    
                    if (overlapStart === 0 && overlapEnd === segmentLength) {
                                                result.push(segment);
                    } else {
                                                const partialText = segment.text.substring(overlapStart, overlapEnd);
                        result.push({ text: partialText, url: segment.url });
                    }
                }
                
                currentPos = segmentEnd;
            }
            
            return result;
        };

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
                    const itmdHeading = { ...dateData, prevStayName: prevDayHadStay ? lastStayName || undefined : undefined } as Record<string, unknown>;
                    hProps['data-itin-date'] = JSON.stringify(itmdHeading);
                    const tzInHeading = (() => {
                        const m = line.match(/@\s*([A-Za-z0-9_./+-]+)/);
                        return m?.[1];
                    })();
                    if (tzInHeading && !isValidIanaTimeZone(tzInHeading)) {
                        hProps['data-itin-warn-date-tz'] = tzInHeading;
                        (itmdHeading as Record<string, unknown>)['warnInvalidTimezone'] = tzInHeading;
                    }
                    para.data = { ...prevData, hProperties: hProps, itmdHeading } as MdNode['data'];
                }
                continue;
            }

                        if (currentDateStr) {
                const prevData = para.data || {};
                const prevH = (prevData.hProperties as Record<string, unknown>) || {};
                const hProps: Record<string, unknown> = { ...prevH };
                if (!hProps['data-itin-date-str']) hProps['data-itin-date-str'] = currentDateStr;
                if (currentDateTz && !hProps['data-itin-date-tz']) hProps['data-itin-date-tz'] = currentDateTz;
                const itmdDate = { dateStr: currentDateStr, dateTz: currentDateTz } as Record<string, unknown>;
                para.data = { ...prevData, hProperties: hProps, itmdDate } as MdNode['data'];
            }

            if (para.type !== 'paragraph') continue;

                        const firstLineText = mdastToString(para as MdNode).trim();


            const parsed = parseTimeAndType(firstLineText, frontmatterTimezone);
            if (!parsed) {
                continue;
            }


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

                                                try {
                            const liChildren = (li as MdNode).children;
                            const firstPara = Array.isArray(liChildren) ? (liChildren.find((n) => n?.type === 'paragraph') as MdNode | undefined) : undefined;
                            
                            if (firstPara?.children) {
                                                                const segments: TextSegment[] = [];
                                let foundColon = false;

                                
                                for (const child of firstPara.children) {
                                    if (!child) continue;
                                    
                                    if (!foundColon) {
                                                                                if (child.type === 'text' && typeof child.value === 'string') {
                                            const colonIdx = child.value.indexOf(':');
                                            if (colonIdx >= 0) {
                                                foundColon = true;
                                                                                                const afterColon = child.value.substring(colonIdx + 1);
                                                if (afterColon) {
                                                    segments.push({ text: afterColon });
                                                }
                                            }
                                        }
                                    } else {
                                                                                const childSegments = nodeToSegments(child);
                                        segments.push(...childSegments);
                                    }
                                }
                                

                                
                                                                if (segments.length > 0 && segments.some(s => s.url)) {
                                                                        mergedMeta[`${key}__segments`] = JSON.stringify(segments);
                                }
                            }
                            
                            const sublists = Array.isArray(liChildren) ? liChildren.filter((n) => n?.type === 'list') : [];
                            liftedNodes.push(...sublists);
                        } catch {
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

            const prevData = para.data || {};
            const prevH = (prevData.hProperties as Record<string, unknown>) || {};
            const itinMeta: Record<string, string> = { ...mergedMeta };
            const hProps: Record<string, unknown> = { ...prevH };
            hProps['data-itin-meta'] = JSON.stringify(itinMeta);
            let warnEventTz: string[] | undefined;
            if (parsed.timeRange?.originalText) {
                const tzTokens = Array.from(parsed.timeRange.originalText.matchAll(/@([A-Za-z0-9_./+-]+)/g)).map((m) => m[1]);
                const invalids = tzTokens.filter((z) => !isValidIanaTimeZone(z));
                if (invalids.length > 0) warnEventTz = Array.from(new Set(invalids));
            }

                        const segments = nodeToSegments(para as MdNode);
            const parseTimezone = currentDateTz && isValidIanaTimeZone(currentDateTz) ? currentDateTz : isValidIanaTimeZone(frontmatterTimezone) ? frontmatterTimezone : options?.timezone;
            const parsedWithSegments = parseEventFromSegments(segments, previousEvent || undefined, parseTimezone, currentDateStr);
            const eventData = parsedWithSegments?.eventData;
            if (eventData) {

                
                                const nameSegments = parsedWithSegments?.nameSegments;
                const departureSegments = parsedWithSegments?.departureSegments;
                const arrivalSegments = parsedWithSegments?.arrivalSegments;
                







                const mergedEvent = { ...eventData, metadata: { ...(eventData as EventData & { metadata?: Record<string, string> }).metadata, ...itinMeta } } as EventData;
                if (options?.stayMode === 'header' && mergedEvent.type === 'stay') {
                    if ('stayName' in mergedEvent && mergedEvent.stayName) {
                        lastStayName = mergedEvent.stayName;
                        currentDayHasStay = true;
                    }
                    const prev = para.data || {};
                    const prevH = (prev.hProperties as Record<string, unknown>) || {};
                    const hProps = { ...prevH, 'data-itmd-skip': 'true' };
                    para.data = { ...prev, itmdSkip: true, hProperties: hProps } as MdNode['data'];
                } else {
                    if (mergedEvent.type === 'stay' && 'stayName' in mergedEvent && mergedEvent.stayName) {
                        lastStayName = mergedEvent.stayName;
                        currentDayHasStay = true;
                    }
                }
                previousEvent = mergedEvent;
                const itmd = {
                    eventData: mergedEvent,
                    dateStr: currentDateStr,
                    dateTz: currentDateTz,
                    warnEventTz,
                    nameSegments,
                    departureSegments,
                    arrivalSegments,
                } as Record<string, unknown>;
                                hProps['data-itmd'] = JSON.stringify(itmd);
                para.data = { ...(para.data || {}), itmd, itinMeta, hProperties: hProps } as MdNode['data'];

            } else {
                                para.data = { ...para.data, itinMeta, hProperties: hProps } as MdNode['data'];
            }

                                }
        return tree;
    };
};
