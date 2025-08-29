import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import YAML from 'yaml';
import { parseDateText } from '../parser/parsers/date';
import { extractMetadata, parseEvent, parseTimeAndType } from '../parser/parsers/event';

type StayMode = 'default' | 'header';

type Options = { baseTz?: string; stayMode?: StayMode };

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

        let frontmatterBaseTz: string | undefined;
        if (file?.data?.frontmatter && typeof file.data.frontmatter === 'object') {
            const fm = file.data.frontmatter;
            if (fm && typeof (fm as Record<string, unknown>).timezone === 'string') {
                frontmatterBaseTz = (fm as Record<string, unknown>).timezone as string;
            }
        } else if (file?.data?.frontmatter && typeof file.data.frontmatter === 'string') {
            try {
                const fm = YAML.parse(file.data.frontmatter as string);
                if (fm && typeof fm === 'object' && typeof (fm as Record<string, unknown>).timezone === 'string') {
                    frontmatterBaseTz = (fm as Record<string, unknown>).timezone as string;
                }
            } catch {}
        }

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
                const dateData = parseDateText(line, frontmatterBaseTz || options?.baseTz);
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
                    if (frontmatterBaseTz) hProps['data-frontmatter-base-tz'] = frontmatterBaseTz;
                    para.data = { ...prevData, hProperties: hProps } as MdNode['data'];
                }
                continue;
            }

            if (para.type !== 'paragraph') continue;

            const line = mdastToString(para as MdNode).trim();
            const parsed = parseTimeAndType(line, frontmatterBaseTz);
            if (!parsed) continue;

            const { mainText } = extractMetadata(parsed.rest);
            const mergedMeta: Record<string, string> = {};
            const notes: string[] = [];

            const source = String(file?.value ?? '');
            const lines = source.split(/\r?\n/);
            const paraEndLine = (para as MdNode)?.position?.end?.line as number | undefined;
            const startIdx = typeof paraEndLine === 'number' ? paraEndLine : undefined;
            if (typeof startIdx === 'number' && startIdx < lines.length) {
                let endIdx = startIdx;
                while (endIdx < lines.length) {
                    const ln = lines[endIdx];
                    if (!ln || ln.trim() === '') break;
                    endIdx += 1;
                }
                const blockLines = lines.slice(startIdx, endIdx);
                if (blockLines.length > 0) {
                    const leadingSpacesCounts = blockLines.filter((l) => l.trim() !== '').map((l) => l.match(/^\s*/)?.[0].length ?? 0);
                    const minIndent = leadingSpacesCounts.length > 0 ? Math.min(...leadingSpacesCounts) : 0;
                    const yamlText = blockLines.map((l) => (l.length >= minIndent ? l.slice(minIndent) : l)).join('\n');
                    try {
                        const parsedYaml = YAML.parse(yamlText);
                        const addNote = (val: unknown) => {
                            if (val === null || val === undefined) return;
                            const s = typeof val === 'string' ? val : JSON.stringify(val);
                            if (s && s.trim() !== '') notes.push(s);
                        };
                        if (Array.isArray(parsedYaml)) {
                            for (const item of parsedYaml) {
                                if (item && typeof item === 'object' && !Array.isArray(item)) {
                                    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
                                        const key = k.toLowerCase();
                                        const value = typeof v === 'string' ? v : JSON.stringify(v);
                                        if (knownKeys.has(key)) mergedMeta[key] = String(value);
                                        else notes.push(`${k}: ${String(value)}`);
                                    }
                                } else {
                                    addNote(item);
                                }
                            }
                        } else if (parsedYaml && typeof parsedYaml === 'object') {
                            for (const [k, v] of Object.entries(parsedYaml as Record<string, unknown>)) {
                                const key = k.toLowerCase();
                                const value = typeof v === 'string' ? v : JSON.stringify(v);
                                if (knownKeys.has(key)) mergedMeta[key] = String(value);
                                else notes.push(`${k}: ${String(value)}`);
                            }
                        } else if (typeof parsedYaml === 'string') {
                            addNote(parsedYaml);
                        }
                    } catch {}

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

            if (notes.length > 0) {
                const current = mergedMeta.note || mergedMeta.text || '';
                const add = notes.join(' / ');
                mergedMeta.note = current ? `${current} / ${add}` : add;
            }

            const rebuilt = `${parsed.timeRange?.originalText ? `${parsed.timeRange.originalText} ` : ''}${parsed.type} ${mainText}`;
            const prevData = para.data || {};
            const prevH = (prevData.hProperties as Record<string, unknown>) || {};
            const itinMeta: Record<string, string> = { ...mergedMeta };
            const hProps: Record<string, unknown> = { ...prevH };
            if (frontmatterBaseTz) hProps['data-frontmatter-base-tz'] = frontmatterBaseTz;
            hProps['data-itin-meta'] = JSON.stringify(itinMeta);

            const parseBaseTz = currentDateTz || frontmatterBaseTz || options?.baseTz;
            const eventData = parseEvent(rebuilt, previousEvent || undefined, parseBaseTz, currentDateStr);
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
