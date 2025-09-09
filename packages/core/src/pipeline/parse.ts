import type { PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { sliceInlineNodes } from '../mdast/index.js';
import type { Services } from '../services/index.js';
import type { EventTime } from '../types.js';
import type { LexTokens } from './lex.js';

type ParagraphNode = { type: 'paragraph'; children: PhrasingContent[] };
const toParagraph = (children: PhrasingContent[]): ParagraphNode => ({
    type: 'paragraph',
    children,
});

export type ParsedHeader = {
    eventType?: string;
    title?: PhrasingContent[] | null;
    destination?:
        | { kind: 'single'; at: PhrasingContent[] }
        | { kind: 'dashPair'; from: PhrasingContent[]; to: PhrasingContent[]; vias?: PhrasingContent[][] }
        | { kind: 'fromTo'; from: PhrasingContent[]; to: PhrasingContent[]; vias?: PhrasingContent[][] }
        | null;
    time?: EventTime | null;
    positions?: {
        title?: { start: number; end: number };
        destination?: {
            from?: { start: number; end: number };
            to?: { start: number; end: number };
            at?: { start: number; end: number };
        };
        time?: {
            start?: { start: number; end: number };
            end?: { start: number; end: number };
            marker?: { start: number; end: number };
        };
    };
};

function parseTimeToken(raw: string): {
    hh: number;
    mm: number;
    tz?: string | null;
    dayOffset?: number | null;
} | null {
    const m = raw.match(/^(\d{1,2}):(\d{2})(?:@([A-Za-z0-9_./+:-]+?))?(?:\+(\d+))?$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const tz = m[3] ? m[3] : null;
    const dayOffset = m[4] ? Number(m[4]) : null;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm, tz, dayOffset };
}

type TimeSpan = ParsedHeader['time'];

export function parseTimeSpan(line: string): { time: TimeSpan; consumed: number } | { time: null; consumed: 0 } {
    const m = line.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?\s*/);
    if (!m) return { time: null, consumed: 0 } as const;
    const startRaw = (m[1] ?? '').trim();
    const endRaw = (m[2] ?? '').trim();
    if (startRaw === '') return { time: { kind: 'none' }, consumed: m[0].length } as const;
    const ls = startRaw.toLowerCase();
    const marker = ls === 'am' || ls === 'pm' ? (ls as 'am' | 'pm') : null;
    if (marker) return { time: { kind: 'marker', marker }, consumed: m[0].length } as const;
    const start = parseTimeToken(startRaw);
    const end = endRaw ? parseTimeToken(endRaw) : null;
    if (start && end)
        return {
            time: {
                kind: 'range',
                start: {
                    hh: start.hh,
                    mm: start.mm,
                    tz: start.tz ?? null,
                    dayOffset: start.dayOffset ?? null,
                },
                end: {
                    hh: end.hh,
                    mm: end.mm,
                    tz: end.tz ?? null,
                    dayOffset: end.dayOffset ?? null,
                },
            },
            consumed: m[0].length,
        } as const;
    if (start && !end)
        return {
            time: {
                kind: 'point',
                start: {
                    hh: start.hh,
                    mm: start.mm,
                    tz: start.tz ?? null,
                    dayOffset: start.dayOffset ?? null,
                },
            },
            consumed: m[0].length,
        } as const;
    return { time: null, consumed: 0 } as const;
}

// Normalize soft breaks in text nodes
function normalizeSoftBreaksInTextNodes(nodes: PhrasingContent[]): PhrasingContent[] {
    const isWordChar = (ch: string | undefined): boolean => !!ch && /[A-Za-z0-9]/.test(ch);
    const getFirstTextChar = (arr: PhrasingContent[], fromIdx: number): string | undefined => {
        for (let i = fromIdx; i < arr.length; i += 1) {
            const n = arr[i] as unknown as { type?: string; value?: string };
            if (n.type === 'text' && typeof n.value === 'string') {
                if (n.value.length > 0) return n.value[0];
            }
            // Skip non-text nodes
        }
        return undefined;
    };
    const getLastTextChar = (arr: PhrasingContent[], fromIdx: number): string | undefined => {
        for (let i = fromIdx; i >= 0; i -= 1) {
            const n = arr[i] as unknown as { type?: string; value?: string };
            if (n.type === 'text' && typeof n.value === 'string') {
                if (n.value.length > 0) return n.value[n.value.length - 1];
            }
        }
        return undefined;
    };
    return nodes.map((node, idx, arr) => {
        if ((node as unknown as { type?: string }).type !== 'text') return node;
        const t = node as unknown as { type: 'text'; value: string };
        if (!t.value.includes('\n')) return node;
        let out = '';
        for (let i = 0; i < t.value.length; i += 1) {
            const ch = t.value[i];
            if (ch !== '\n') {
                out += ch;
                continue;
            }
            const prevChar = i > 0 ? t.value[i - 1] : getLastTextChar(arr, idx - 1);
            const nextChar = i < t.value.length - 1 ? t.value[i + 1] : getFirstTextChar(arr, idx + 1);
            if (isWordChar(prevChar) && isWordChar(nextChar)) {
                // Remove break within a word
            } else {
                // Otherwise insert a space
                out += ' ';
            }
        }
        return { ...t, value: out } as unknown as PhrasingContent;
    });
}

function splitHeadAndDestUsingSeps(
    line: string,
    tokens: LexTokens,
    consumed: number
): {
    headRaw: string;
    destRaw: string | null;
    sep: 'doublecolon' | 'at' | 'from' | null;
} {
    const lower = line.toLowerCase();
    type SepKind = 'doublecolon' | 'at' | 'from';
    const seps = (tokens.seps || []).filter((s) => s.kind === 'doublecolon' || s.kind === 'at' || s.kind === 'from') as Array<{ kind: SepKind; index: number }>;

    let chosen: { kind: SepKind; rawIdx: number } | null = null;
    const sorted = seps.filter((s) => s.index >= consumed).sort((a, b) => a.index - b.index);
    for (const s of sorted) {
        const rawIdxWord = tokens.map(s.index);
        if (s.kind === 'from') {
            // Enable only when ' from ' (spaces required) and a following ' to ' exist
            const hasLeadingSpace = rawIdxWord > 0 && lower[rawIdxWord - 1] === ' ';
            const hasTrailingSpace = lower[rawIdxWord + 4] === ' ';
            if (!(hasLeadingSpace && hasTrailingSpace)) continue;
            const toIdx = lower.indexOf(' to ', rawIdxWord + 5);
            if (toIdx < 0) continue;
            // Align rawIdx to the leading space
            chosen = { kind: 'from', rawIdx: rawIdxWord - 1 };
            break;
        }
        // Use '::' / 'at' as-is
        chosen = { kind: s.kind, rawIdx: rawIdxWord };
        break;
    }

    if (!chosen) {
        const s = line.slice(consumed).trim();
        return { headRaw: s, destRaw: null, sep: null };
    }

    const headRaw = line.slice(consumed, chosen.rawIdx).trim();
    const skipLen = chosen.kind === 'doublecolon' ? 2 : chosen.kind === 'at' ? 2 : ' from '.length;
    const destRaw = line.slice(chosen.rawIdx + skipLen).trim();
    return { headRaw, destRaw, sep: chosen.kind };
}

function parseHead(headRaw: string): {
    eventType?: string;
    title: PhrasingContent[] | null;
} {
    const tokens = headRaw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { eventType: undefined, title: null };
    const eventType = tokens[0];
    const titleText = tokens.slice(1).join(' ').trim();
    const title = titleText ? ([{ type: 'text', value: titleText } as unknown as PhrasingContent] as PhrasingContent[]) : null;
    return { eventType, title };
}

export function parseHeader(tokens: LexTokens, mdInline: PhrasingContent[], _sv: Services): ParsedHeader {
    const line = tokens.raw.trim();
    const ts = parseTimeSpan(line);
    const { headRaw, destRaw, sep } = splitHeadAndDestUsingSeps(line, tokens, ts.consumed);
    const head = parseHead(headRaw);

    // Slice partial inline nodes from mdast (partial matches replaced with text nodes)
    const hasInline = Array.isArray(mdInline) && mdInline.length > 0;
    const inlineFullText = hasInline ? mdastToString(toParagraph(mdInline)) : tokens.raw.trim();
    const sliceInline = (start: number, end: number): PhrasingContent[] => {
        if (end <= start) return [];
        if (hasInline) return sliceInlineNodes(mdInline, start, end);
        const substr = inlineFullText.slice(start, end);
        return substr ? ([{ type: 'text', value: substr }] as unknown as PhrasingContent[]) : [];
    };
    const pickInline = (start: number, end: number): PhrasingContent[] => normalizeSoftBreaksInTextNodes(sliceInline(start, end).filter((n) => mdastToString(toParagraph([n])).trim() !== ''));

    // Compute absolute offsets relative to inlineFullText
    const consumedInline = ((): number => {
        const m = inlineFullText.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?\s*/);
        return m ? m[0].length : 0;
    })();
    const headStartInline = consumedInline;
    const headFoundAt = inlineFullText.indexOf(headRaw, headStartInline);
    const headEndInline = headFoundAt >= 0 ? headFoundAt + headRaw.length : inlineFullText.length;
    let headTitleStartInline = headFoundAt >= 0 ? headFoundAt : headStartInline;
    if (head.eventType && headFoundAt >= 0) {
        const re = new RegExp(`^\\s*${head.eventType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+|$)`);
        const m = headRaw.match(re);
        if (m) headTitleStartInline += m[0].length;
    }

    let titleInline: PhrasingContent[] | null = null;
    if (headTitleStartInline < headEndInline) {
        titleInline = sliceInline(headTitleStartInline, headEndInline);
        if (mdastToString(toParagraph(titleInline)).trim() === '') titleInline = null;
    }

    let destination: ParsedHeader['destination'] = null;
    const positions: NonNullable<ParsedHeader['positions']> = {};
    // time positions using absolute offsets
    const tm = inlineFullText.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?/);
    if (tm) {
        const matchStr = tm[0];
        const firstOpen = matchStr.indexOf('[');
        const firstStart = firstOpen + 1;
        const firstEnd = firstStart + (tm[1] ? tm[1].length : 0);
        if (tm[1])
            positions.time = {
                ...(positions.time || {}),
                start: { start: firstStart, end: firstEnd },
            };
        if (tm[2]) {
            const lastOpen = matchStr.lastIndexOf('[');
            const secondStart = lastOpen + 1;
            const secondEnd = secondStart + tm[2].length;
            positions.time = {
                ...(positions.time || {}),
                start: positions.time?.start,
                end: { start: secondStart, end: secondEnd },
            };
        }
        if ((tm[1] || '').toLowerCase() === 'am' || (tm[1] || '').toLowerCase() === 'pm') {
            positions.time = {
                ...(positions.time || {}),
                marker: { start: firstStart, end: firstEnd },
            };
        }
    }
    if (destRaw) {
        // First search after headEnd; otherwise search entire text
        let destStartInline = inlineFullText.indexOf(destRaw, headEndInline);
        if (destStartInline < 0) destStartInline = inlineFullText.indexOf(destRaw);
        const destEndInline = destStartInline >= 0 ? destStartInline + destRaw.length : inlineFullText.length;
        const idx = destRaw.lastIndexOf(' - ');
        const lowerDest = destRaw.toLowerCase();
        let handledFromTo = false;
        // If explicit 'from' is used, prefer 'X to Y' and collect 'via' segments between them
        if (!destination && sep === 'from') {
            const toIdxRel = lowerDest.indexOf(' to ');
            if (toIdxRel >= 0) {
                const fromStart = destStartInline; // destRaw starts right after 'from '
                // Split [0, toIdxRel) by ' via '
                const segsAbs: Array<{ s: number; e: number }> = [];
                let cursorRel = 0;
                while (true) {
                    const nextVia = lowerDest.indexOf(' via ', cursorRel);
                    if (nextVia < 0 || nextVia >= toIdxRel) break;
                    segsAbs.push({ s: destStartInline + cursorRel, e: destStartInline + nextVia });
                    cursorRel = nextVia + ' via '.length;
                }
                // Last segment before 'to'
                segsAbs.push({ s: destStartInline + cursorRel, e: destStartInline + toIdxRel });

                const fromEnd = segsAbs[0]?.e ?? destStartInline + toIdxRel;
                const toStart = destStartInline + toIdxRel + ' to '.length;
                const toEnd = destEndInline;
                const vias: PhrasingContent[][] = segsAbs.length > 1 ? segsAbs.slice(1).map(({ s, e }) => pickInline(s, e)) : [];
                destination = {
                    kind: 'fromTo',
                    from: pickInline(fromStart, fromEnd),
                    to: pickInline(toStart, toEnd),
                    ...(vias.length > 0 ? { vias } : {}),
                } as ParsedHeader['destination'];
                positions.destination = {
                    from: { start: fromStart, end: fromEnd },
                    to: { start: toStart, end: toEnd },
                };
                handledFromTo = true;
            }
        }
        // Detect generic ' from X via ... to Y ' or ' from X to Y ' pattern
        if (!destination && !handledFromTo) {
            const fromIdxRel = lowerDest.indexOf(' from ');
            if (fromIdxRel >= 0) {
                const toIdxRel = lowerDest.indexOf(' to ', fromIdxRel + ' from '.length);
                if (toIdxRel >= 0) {
                    const fromStart = destStartInline + fromIdxRel + ' from '.length; // after ' from '
                    // Collect segments between 'from' and 'to' split by ' via '
                    const segsAbs: Array<{ s: number; e: number }> = [];
                    let cursorRel = fromIdxRel + ' from '.length;
                    while (true) {
                        const nextVia = lowerDest.indexOf(' via ', cursorRel);
                        if (nextVia < 0 || nextVia >= toIdxRel) break;
                        segsAbs.push({ s: destStartInline + cursorRel, e: destStartInline + nextVia });
                        cursorRel = nextVia + ' via '.length;
                    }
                    segsAbs.push({ s: destStartInline + cursorRel, e: destStartInline + toIdxRel });

                    const fromEnd = segsAbs[0]?.e ?? destStartInline + toIdxRel;
                    const toStart = destStartInline + toIdxRel + ' to '.length; // after ' to '
                    const toEnd = destEndInline;
                    const vias: PhrasingContent[][] = segsAbs.length > 1 ? segsAbs.slice(1).map(({ s, e }) => pickInline(s, e)) : [];
                    destination = {
                        kind: 'fromTo',
                        from: pickInline(fromStart, fromEnd),
                        to: pickInline(toStart, toEnd),
                        ...(vias.length > 0 ? { vias } : {}),
                    } as ParsedHeader['destination'];
                    positions.destination = {
                        from: { start: fromStart, end: fromEnd },
                        to: { start: toStart, end: toEnd },
                    };
                    handledFromTo = true;
                }
            }
        }
        if (!destination && idx >= 0) {
            // Split all ' - ' occurrences into segments: first=from, last=to, middle=vias
            const partsAbs: Array<{ s: number; e: number }> = [];
            let cursorRel = 0;
            while (true) {
                const nextDash = destRaw.indexOf(' - ', cursorRel);
                if (nextDash < 0) break;
                partsAbs.push({ s: destStartInline + cursorRel, e: destStartInline + nextDash });
                cursorRel = nextDash + 3;
            }
            // tail
            partsAbs.push({ s: destStartInline + cursorRel, e: destEndInline });

            if (partsAbs.length >= 2) {
                const fromStart = partsAbs[0].s;
                const fromEnd = partsAbs[0].e;
                const toStart = partsAbs[partsAbs.length - 1].s;
                const toEnd = partsAbs[partsAbs.length - 1].e;
                const vias: PhrasingContent[][] = partsAbs.slice(1, -1).map(({ s, e }) => normalizeSoftBreaksInTextNodes(sliceInline(s, e)));
                destination = {
                    kind: 'dashPair',
                    from: normalizeSoftBreaksInTextNodes(sliceInline(fromStart, fromEnd)),
                    to: normalizeSoftBreaksInTextNodes(sliceInline(toStart, toEnd)),
                    ...(vias.length > 0 ? { vias } : {}),
                } as ParsedHeader['destination'];
                positions.destination = {
                    from: { start: fromStart, end: fromEnd },
                    to: { start: toStart, end: toEnd },
                };
            }
        } else if (sep === 'doublecolon' || sep === 'at') {
            destination = {
                kind: 'single',
                at: normalizeSoftBreaksInTextNodes(sliceInline(destStartInline, destEndInline)),
            } as ParsedHeader['destination'];
            positions.destination = {
                at: { start: destStartInline, end: destEndInline },
            };
        }
    }

    // Final title: fallback to text-based head.title if not extractable from mdInline.
    const title = ((): PhrasingContent[] | null => {
        if (titleInline && titleInline.length > 0) return titleInline;
        if (head.title && mdastToString(toParagraph(head.title)).trim() !== '') return head.title;
        return null;
    })();
    if (titleInline) positions.title = { start: headTitleStartInline, end: headEndInline };
    return {
        eventType: head.eventType,
        title,
        time: ts.time,
        destination,
        positions,
    };
}
