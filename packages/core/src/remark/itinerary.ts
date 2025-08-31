import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import YAML from 'yaml';
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
        let isItinerary = true; // 既存互換: デフォルト有効
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
                    // base_tzのデータ属性は出力しない
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
            let handledNextList = false;

            const nextElement = children[i + 1] as MdNode;
            if (nextElement && nextElement.type === 'list') {
                const listItems = (nextElement.children || []) as MdNode[];
                for (const item of listItems) {
                    const itemText = mdastToString(item).trim();
                    const colonIndex = itemText.indexOf(':');
                    if (colonIndex > 0) {
                        const key = itemText.substring(0, colonIndex).trim().toLowerCase();
                        const value = itemText.substring(colonIndex + 1).trim();
                        if (knownKeys.has(key)) {
                            mergedMeta[key] = value;
                        } else {
                            notes.push(itemText);
                        }
                    } else {
                        notes.push(itemText);
                    }
                }
                // ASTからリストノードを削除（重複表示を防ぐため）
                children.splice(i + 1, 1);
                handledNextList = true;
            }

            const source = String(file?.value ?? '');
            const lines = source.split(/\r?\n/);
            const paraStartLine = (para as MdNode)?.position?.start?.line as number | undefined;
            const paraEndLine = (para as MdNode)?.position?.end?.line as number | undefined;

            if (typeof paraStartLine === 'number' && typeof paraEndLine === 'number') {
                const eventLines = lines.slice(paraStartLine - 1, paraEndLine);

                const freeTextWithinPara: string[] = [];
                for (let idx = 1; idx < eventLines.length; idx++) {
                    const line = eventLines[idx];
                    if (line.match(/^\s*-\s+/)) {
                        const metaText = line.replace(/^\s*-\s+/, '').trim();
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
                            // コロン無しの箇条書きもノートとして取り込む
                            notes.push(metaText);
                        }
                    } else if (line && line.trim() !== '') {
                        // 箇条書きではない行は、段落内の自由テキストとして保持する
                        freeTextWithinPara.push(line.trim());
                    }
                }
                // 段落内自由テキストが存在する場合は、イベント段落の直後に別段落として挿入する
                if (freeTextWithinPara.length > 0) {
                    const newParagraph: MdNode = {
                        type: 'paragraph',
                        children: [{ type: 'text', value: freeTextWithinPara.join('\n') }],
                    };
                    children.splice(i + 1, 0, newParagraph);
                }
            }

            // イベント後の連続したテキストをYAMLメタデータとして処理する（オプション）
            // 単純な一行テキストは通常のMarkdownテキストとして残す
            const paraLineIdx = typeof paraEndLine === 'number' ? paraEndLine : undefined;
            if (typeof paraLineIdx === 'number' && paraLineIdx < lines.length) {
                // 段落直後の空行をスキップし、最初の非空行からブロックを収集
                let startIdx = paraLineIdx;
                while (startIdx < lines.length && (!lines[startIdx] || lines[startIdx].trim() === '')) {
                    startIdx += 1;
                }
                let endIdx = startIdx;
                while (endIdx < lines.length) {
                    const ln = lines[endIdx];
                    if (!ln || ln.trim() === '') break;
                    endIdx += 1;
                }
                const blockLines = lines.slice(startIdx, endIdx);
                if (blockLines.length > 0) {
                    const nonEmpty = blockLines.filter((l) => l.trim() !== '');
                    let handled = false;

                    // 箇条書きだけで構成されているブロック（1行でも可）はメタ/ノートとして取り込む
                    const isListBlock = nonEmpty.length > 0 && nonEmpty.every((l) => /^-\s+/.test(l.trim()));
                    if (isListBlock) {
                        // 直後のlistを既に処理済みなら二重取り込みを避ける
                        if (handledNextList) {
                            handled = true; // 削除だけ行う（nextElementで既に削除済みのはずだが保険）
                        } else {
                            for (const raw of nonEmpty) {
                                const metaText = raw.trim().replace(/^-\s+/, '').trim();
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
                            handled = true;
                        }
                    } else if (blockLines.length > 1) {
                        // 複数行の場合のみYAMLとして処理
                        const leadingSpacesCounts = blockLines.filter((l) => l.trim() !== '').map((l) => l.match(/^\s*/)?.[0].length ?? 0);
                        const minIndent = leadingSpacesCounts.length > 0 ? Math.min(...leadingSpacesCounts) : 0;
                        const yamlText = blockLines.map((l) => (l.length >= minIndent ? l.slice(minIndent) : l)).join('\n');

                        // YAML構造らしい特徴があるかチェック
                        const hasYamlStructure = yamlText.includes(':') || yamlText.match(/^\s*-\s+/m);

                        if (hasYamlStructure) {
                            let yamlParsed = false;
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
                                    yamlParsed = true;
                                } else if (parsedYaml && typeof parsedYaml === 'object') {
                                    for (const [k, v] of Object.entries(parsedYaml as Record<string, unknown>)) {
                                        const key = k.toLowerCase();
                                        const value = typeof v === 'string' ? v : JSON.stringify(v);
                                        if (knownKeys.has(key)) mergedMeta[key] = String(value);
                                        else notes.push(`${k}: ${String(value)}`);
                                    }
                                    yamlParsed = true;
                                }
                            } catch (e) {
                                console.warn('Failed to parse YAML block:', e);
                            }

                            if (yamlParsed) handled = true;
                        }
                    }

                    if (handled) {
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
