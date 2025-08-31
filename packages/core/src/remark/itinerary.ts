import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { parseDateText } from '../parser/parsers/date';
import { parseEvent, parseTimeAndType } from '../parser/parsers/event';
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
            const isItin = typeLc === 'itinerary-md' || typeLc === 'itmd';
            const timezone = getString((raw as Record<string, unknown>)['timezone']);
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

        const knownKeys = new Set(['cost', 'price', 'seat', 'room', 'guests', 'aircraft', 'vehicle', 'location', 'addr', 'phone', 'wifi', 'rating', 'reservation', 'checkin', 'checkout', 'tag', 'cuisine', 'note', 'desc', 'text']);

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
                const dateData = parseDateText(line, frontmatterTimezone || options?.timezone);
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
                    para.data = { ...prevData, hProperties: hProps } as MdNode['data'];
                }
                continue;
            }

            if (para.type !== 'paragraph') continue;

            const paraChildren = (para as MdNode).children || [];
            const firstLineText = paraChildren.length > 0 && paraChildren[0].type === 'text' ? String(paraChildren[0].value || '').trim() : mdastToString(para as MdNode).trim();

            const parsed = parseTimeAndType(firstLineText, frontmatterTimezone);
            if (!parsed) continue;

            const mainText = parsed.eventDescription;
            const mergedMeta: Record<string, string> = {};
            const notes: string[] = [];

            const source = String(file?.value ?? '');
            const lines = source.split(/\r?\n/);
            const paraEndLine = (para as MdNode)?.position?.end?.line as number | undefined;

            const paraLineIdx = typeof paraEndLine === 'number' ? paraEndLine : undefined;
            if (typeof paraLineIdx === 'number' && paraLineIdx < lines.length) {
                const startIdx = paraLineIdx;
                const firstLine = lines[startIdx] ?? '';
                if (!firstLine || firstLine.trim() === '') {
                } else {
                    const isIndentedBullet = /^\s+-\s+/.test(firstLine);
                    if (isIndentedBullet) {
                        let endIdx = startIdx;
                        while (endIdx < lines.length) {
                            const ln = lines[endIdx];
                            if (!ln || ln.trim() === '') break;
                            if (!/^\s+-\s+/.test(ln)) break;
                            endIdx += 1;
                        }
                        const blockLines = lines.slice(startIdx, endIdx);
                        for (const raw of blockLines) {
                            const metaText = raw.replace(/^\s+-\s+/, '').trim();
                            const colonIndex = metaText.indexOf(':');
                            if (colonIndex > 0) {
                                const key = metaText.substring(0, colonIndex).trim().toLowerCase();
                                const value = metaText.substring(colonIndex + 1).trim();
                                if (knownKeys.has(key)) {
                                    mergedMeta[key] = value;
                                } else {
                                    notes.push(metaText);
                                }
                            } else {
                                notes.push(metaText);
                            }
                        }
                        const blockStartLine = startIdx + 1;
                        const blockEndLine = endIdx;
                        const j = i + 1;
                        while (j < children.length) {
                            const child = children[j] as MdNode;
                            const startLine = child?.position?.start?.line;
                            if (typeof startLine !== 'number') break;
                            if (startLine >= blockStartLine && startLine <= blockEndLine) {
                                children.splice(j, 1);
                            } else {
                                break;
                            }
                        }
                    }
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

            const parseTimezone = currentDateTz || frontmatterTimezone || options?.timezone;
            const eventData = parseEvent(rebuilt, previousEvent || undefined, parseTimezone, currentDateStr);
            if (eventData) {
                const mergedEvent = { ...eventData, metadata: { ...eventData.metadata, ...itinMeta } } as typeof eventData;
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
            }

            para.data = { ...prevData, itinMeta, hProperties: hProps } as MdNode['data'];

            para.children = [{ type: 'text', value: rebuilt }];
        }
        return tree;
    };
};
