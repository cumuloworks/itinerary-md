import type { PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Services } from '../services';
import type { EventTime } from '../types';
import { sliceInlineNodes } from '../utils/mdast-inline';
import type { LexTokens } from './lex';

export type ParsedHeader = {
    eventType?: string;
    title?: PhrasingContent[] | null;
    destination?: ({ kind: 'single'; at: PhrasingContent[] } | { kind: 'dashPair'; from: PhrasingContent[]; to: PhrasingContent[] } | { kind: 'fromTo'; from: PhrasingContent[]; to: PhrasingContent[] }) | null;
    time?: EventTime | null;
};

function parseTimeToken(raw: string): { hh: number | null; mm: number | null; tz?: string | null; dayOffset?: number | null } | null {
    const m = raw.match(/^(\d{1,2}):(\d{2})(?:@([A-Za-z0-9_./+-]+))?(?:\+(\d+))?/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const tz = m[3] ? m[3] : null;
    const dayOffset = m[4] ? Number(m[4]) : null;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return { hh, mm, tz, dayOffset };
}

type TimeSpan = ParsedHeader['time'];

function parseTimeSpan(line: string): { time: TimeSpan; consumed: number } | { time: null; consumed: 0 } {
    const m = line.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?\s*/);
    if (!m) return { time: null, consumed: 0 } as const;
    const startRaw = m[1] ?? '';
    const endRaw = m[2] ?? '';
    const marker = startRaw === 'am' || startRaw === 'pm' ? (startRaw as 'am' | 'pm') : null;
    if (marker) return { time: { kind: 'marker', marker }, consumed: m[0].length };
    const start = parseTimeToken(startRaw);
    const end = endRaw ? parseTimeToken(endRaw) : null;
    if (start && end)
        return {
            time: { kind: 'range', start: { hh: start.hh!, mm: start.mm!, tz: start.tz ?? null, dayOffset: start.dayOffset ?? null }, end: { hh: end.hh!, mm: end.mm!, tz: end.tz ?? null, dayOffset: end.dayOffset ?? null } },
            consumed: m[0].length,
        };
    if (start && !end) return { time: { kind: 'point', start: { hh: start.hh!, mm: start.mm!, tz: start.tz ?? null, dayOffset: start.dayOffset ?? null } }, consumed: m[0].length };
    // []（時間なし）
    return { time: { kind: 'none' }, consumed: m[0].length };
}

function splitHeadAndDestUsingSeps(line: string, tokens: LexTokens, consumed: number): { headRaw: string; destRaw: string | null; sep: 'doublecolon' | 'at' | null } {
    const seps = (tokens.seps || []).filter((s) => s.kind === 'doublecolon' || s.kind === 'at') as Array<{ kind: 'doublecolon' | 'at'; index: number }>;
    const first = seps.filter((s) => s.index >= consumed).sort((a, b) => a.index - b.index)[0];
    if (!first) {
        const s = line.slice(consumed).trim();
        return { headRaw: s, destRaw: null, sep: null };
    }
    const rawIdx = tokens.map(first.index);
    const headRaw = line.slice(consumed, rawIdx).trim();
    const skipLen = first.kind === 'doublecolon' ? 2 : 2; // '::' or 'at'
    const destRaw = line.slice(rawIdx + skipLen).trim();
    return { headRaw, destRaw, sep: first.kind };
}

function parseHead(headRaw: string): { eventType?: string; title: PhrasingContent[] | null } {
    const tokens = headRaw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { eventType: undefined, title: null };
    const eventType = tokens[0];
    const titleText = tokens.slice(1).join(' ').trim();
    const title = titleText ? ([{ type: 'text', value: titleText } as unknown as PhrasingContent] as PhrasingContent[]) : null;
    return { eventType, title };
}

function parseDest(destRaw: string | null, sep: 'doublecolon' | 'at' | null): ParsedHeader['destination'] {
    if (!destRaw) return null;
    const s = destRaw.trim();
    const idx = s.lastIndexOf(' - ');
    if (idx >= 0) {
        const fromText = s.slice(0, idx).trim();
        const toText = s.slice(idx + 3).trim();
        return {
            kind: 'dashPair',
            from: [{ type: 'text', value: fromText } as unknown as PhrasingContent],
            to: [{ type: 'text', value: toText } as unknown as PhrasingContent],
        };
    }
    if (sep === 'doublecolon' || sep === 'at') {
        return {
            kind: 'single',
            at: [{ type: 'text', value: s } as unknown as PhrasingContent],
        };
    }
    return null;
}

export function parseHeader(tokens: LexTokens, mdInline: PhrasingContent[], _sv: Services): ParsedHeader {
    const line = tokens.raw.trim();
    const ts = parseTimeSpan(line);
    const afterTime = line.slice(ts.consumed);
    const { headRaw, destRaw, sep } = splitHeadAndDestUsingSeps(line, tokens, ts.consumed);
    const head = parseHead(headRaw);

    // mdast インラインから部分インラインを切り出す簡易ヘルパ（部分一致は text ノードで代替）
    const hasInline = Array.isArray(mdInline) && mdInline.length > 0;
    const inlineFullText = hasInline ? mdastToString({ type: 'paragraph', children: mdInline } as unknown as { type: string; children: PhrasingContent[] }) : tokens.raw.trim();
    const sliceInline = (start: number, end: number): PhrasingContent[] => {
        if (end <= start) return [];
        if (hasInline) return sliceInlineNodes(mdInline, start, end);
        const substr = inlineFullText.slice(start, end);
        return substr ? ([{ type: 'text', value: substr }] as unknown as PhrasingContent[]) : [];
    };

    // 絶対オフセットの算出
    // inlineFullText 基準のオフセットを算出（mdInlineに対する位置）
    const consumedInline = ((): number => {
        const m = inlineFullText.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?\s*/);
        return m ? m[0].length : 0;
    })();
    const headStartInline = consumedInline;
    const headFoundAt = inlineFullText.indexOf(headRaw, headStartInline);
    const headEndInline = headFoundAt >= 0 ? headFoundAt + headRaw.length : inlineFullText.length;
    let headTitleStartInline = headFoundAt >= 0 ? headFoundAt : headStartInline;
    if (head.eventType && headFoundAt >= 0) {
        const re = new RegExp('^\\s*' + head.eventType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s+|$)');
        const m = headRaw.match(re);
        if (m) headTitleStartInline += m[0].length;
    }

    let titleInline: PhrasingContent[] | null = null;
    if (headTitleStartInline < headEndInline) {
        titleInline = sliceInline(headTitleStartInline, headEndInline);
        if (mdastToString({ type: 'paragraph', children: titleInline } as any).trim() === '') titleInline = null;
    }

    let destination: ParsedHeader['destination'] = null;
    if (destRaw) {
        // 先に headEnd 以降での一致を探し、見つからなければ全文から検索
        let destStartInline = inlineFullText.indexOf(destRaw, headEndInline);
        if (destStartInline < 0) destStartInline = inlineFullText.indexOf(destRaw);
        const destEndInline = destStartInline >= 0 ? destStartInline + destRaw.length : inlineFullText.length;
        const idx = destRaw.lastIndexOf(' - ');
        // from/to 構文の検出（両方含む場合に限る）
        const hasFrom = /\bfrom\b/.test(destRaw);
        const hasTo = /\bto\b/.test(destRaw);
        if (hasFrom && hasTo) {
            const fromIdx = destRaw.indexOf('from');
            const toIdx = destRaw.indexOf('to', fromIdx + 4);
            const fromStart = destStartInline + fromIdx + 4; // after 'from'
            const fromEnd = destStartInline + (toIdx >= 0 ? toIdx : destRaw.length);
            const toStart = destStartInline + (toIdx >= 0 ? toIdx + 2 : destRaw.length); // after 'to'
            const toEnd = destEndInline;
            destination = {
                kind: 'fromTo',
                from: sliceInline(fromStart, fromEnd).filter((n) => mdastToString({ type: 'paragraph', children: [n] } as any).trim() !== ''),
                to: sliceInline(toStart, toEnd).filter((n) => mdastToString({ type: 'paragraph', children: [n] } as any).trim() !== ''),
            } as ParsedHeader['destination'];
        } else if (idx >= 0) {
            const fromStart = destStartInline;
            const fromEnd = destStartInline + idx;
            const toStart = destStartInline + idx + 3;
            const toEnd = destEndInline;
            destination = {
                kind: 'dashPair',
                from: sliceInline(fromStart, fromEnd),
                to: sliceInline(toStart, toEnd),
            } as ParsedHeader['destination'];
        } else if (sep === 'doublecolon' || sep === 'at') {
            destination = {
                kind: 'single',
                at: sliceInline(destStartInline, destEndInline),
            } as ParsedHeader['destination'];
        }
    } else if (sep === null && headRaw.includes(' - ')) {
        // no sep, but has route-like "A - B" → treat as dashPair and drop title
        const headIdx = headRaw.lastIndexOf(' - ');
        const found = inlineFullText.indexOf(headRaw, headStartInline);
        const absStart = found >= 0 ? found : headStartInline;
        if (headIdx >= 0) {
            const fromStart = absStart;
            const fromEnd = absStart + headIdx;
            const toStart = absStart + headIdx + 3;
            const toEnd = absStart + headRaw.length;
            destination = {
                kind: 'dashPair',
                from: sliceInline(fromStart, fromEnd),
                to: sliceInline(toStart, toEnd),
            } as ParsedHeader['destination'];
        }
    } else if (sep === null) {
        // from ... to ... 構文（ヘッダ内）
        const found = inlineFullText.indexOf(headRaw, headStartInline);
        const absStart = found >= 0 ? found : headStartInline;
        const relFromIdx = headRaw.search(/\bfrom\b/);
        const relToIdx = relFromIdx >= 0 ? headRaw.slice(relFromIdx + 4).search(/\bto\b/) : -1;
        if (relFromIdx >= 0 && relToIdx >= 0) {
            const toIdxAbsRel = relFromIdx + 4 + relToIdx; // position of 'to'
            const fromLabelStart = absStart + relFromIdx + 4; // after 'from'
            const toLabelStart = absStart + toIdxAbsRel + 2; // after 'to'
            const endAbs = absStart + headRaw.length;
            // title は from の手前まで
            const ttl = sliceInline(headTitleStartInline, absStart + relFromIdx);
            titleInline = mdastToString({ type: 'paragraph', children: ttl } as any).trim() === '' ? titleInline : ttl;
            destination = {
                kind: 'fromTo',
                from: sliceInline(fromLabelStart, absStart + toIdxAbsRel),
                to: sliceInline(toLabelStart, endAbs),
            } as ParsedHeader['destination'];
        }
    }

    // タイトル最終決定: no-sep かつ dashPair のときは title=null（ルート解釈）。
    // それ以外では、mdInline から抽出できなければ text ベースの head.title をフォールバックに使う。
    const title = ((): PhrasingContent[] | null => {
        if (destination && (destination as any).kind === 'dashPair' && sep === null) return null;
        if (titleInline && titleInline.length > 0) return titleInline;
        return head.title ?? null;
    })();
    return { eventType: head.eventType, title, time: ts.time, destination };
}
