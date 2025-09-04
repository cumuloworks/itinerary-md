import type { PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Services } from '../services';
import type { EventTime } from '../types';
import { sliceInlineNodes } from '../utils/mdast-inline';
import type { LexTokens } from './lex';

// Minimal paragraph helper to avoid any-casts when calling mdastToString
type ParagraphNode = { type: 'paragraph'; children: PhrasingContent[] };
const toParagraph = (children: PhrasingContent[]): ParagraphNode => ({ type: 'paragraph', children });

export type ParsedHeader = {
    eventType?: string;
    title?: PhrasingContent[] | null;
    destination?: ({ kind: 'single'; at: PhrasingContent[] } | { kind: 'dashPair'; from: PhrasingContent[]; to: PhrasingContent[] } | { kind: 'fromTo'; from: PhrasingContent[]; to: PhrasingContent[] }) | null;
    time?: EventTime | null;
    positions?: {
        title?: { start: number; end: number };
        destination?: { from?: { start: number; end: number }; to?: { start: number; end: number }; at?: { start: number; end: number } };
        time?: { start?: { start: number; end: number }; end?: { start: number; end: number }; marker?: { start: number; end: number } };
    };
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

// ヘッダ抽出時、改行が単語内に入るケースを許容するため、テキストノード内の改行のみ除去する
function removeNewlinesInTextNodes(nodes: PhrasingContent[]): PhrasingContent[] {
    return nodes.map((n) => {
        if ((n as unknown as { type?: string }).type === 'text') {
            const t = n as unknown as { type: 'text'; value: string };
            return { ...t, value: t.value.replace(/\n/g, '') } as unknown as PhrasingContent;
        }
        return n;
    });
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

export function parseHeader(tokens: LexTokens, mdInline: PhrasingContent[], _sv: Services): ParsedHeader {
    const line = tokens.raw.trim();
    const ts = parseTimeSpan(line);
    const { headRaw, destRaw, sep } = splitHeadAndDestUsingSeps(line, tokens, ts.consumed);
    const head = parseHead(headRaw);

    // mdast インラインから部分インラインを切り出す簡易ヘルパ（部分一致は text ノードで代替）
    const hasInline = Array.isArray(mdInline) && mdInline.length > 0;
    const inlineFullText = hasInline ? mdastToString(toParagraph(mdInline)) : tokens.raw.trim();
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
    // time positions（角括弧内の中身範囲を absolute offset で保持）
    const tm = inlineFullText.match(/^\[(.*?)\](?:\s*-\s*\[(.*?)\])?/);
    if (tm) {
        const matchStr = tm[0];
        const firstOpen = matchStr.indexOf('[');
        const firstStart = firstOpen + 1;
        const firstEnd = firstStart + (tm[1] ? tm[1].length : 0);
        if (tm[1]) positions.time = { ...(positions.time || {}), start: { start: firstStart, end: firstEnd } };
        if (tm[2]) {
            const lastOpen = matchStr.lastIndexOf('[');
            const secondStart = lastOpen + 1;
            const secondEnd = secondStart + tm[2].length;
            positions.time = { ...(positions.time || {}), start: positions.time?.start, end: { start: secondStart, end: secondEnd } };
        }
        if (tm[1] === 'am' || tm[1] === 'pm') {
            positions.time = { ...(positions.time || {}), marker: { start: firstStart, end: firstEnd } };
        }
    }
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
                from: removeNewlinesInTextNodes(sliceInline(fromStart, fromEnd).filter((n) => mdastToString(toParagraph([n])).trim() !== '')),
                to: removeNewlinesInTextNodes(sliceInline(toStart, toEnd).filter((n) => mdastToString(toParagraph([n])).trim() !== '')),
            } as ParsedHeader['destination'];
            positions.destination = { from: { start: fromStart, end: fromEnd }, to: { start: toStart, end: toEnd } };
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
            positions.destination = { from: { start: fromStart, end: fromEnd }, to: { start: toStart, end: toEnd } };
        } else if (sep === 'doublecolon' || sep === 'at') {
            destination = {
                kind: 'single',
                at: sliceInline(destStartInline, destEndInline),
            } as ParsedHeader['destination'];
            positions.destination = { at: { start: destStartInline, end: destEndInline } };
        }
    } else if (sep === null) {
        // from ... to ... 構文（ヘッダ内）
        const found = inlineFullText.indexOf(headRaw, headStartInline);
        const absStart = found >= 0 ? found : headStartInline;
        const relFromIdx = headRaw.search(/\bfrom\b/);
        const relToIdx = relFromIdx >= 0 ? headRaw.slice(relFromIdx + 4).search(/\bto\b/) : -1;
        if (relFromIdx >= 0 && relToIdx >= 0) {
            const toIdxAbsRel = relFromIdx + 4 + relToIdx; // position of 'to'
            // raw absolute ranges (exclusive end)
            let fromLabelStart = absStart + relFromIdx + 4; // after 'from'
            let fromLabelEnd = absStart + toIdxAbsRel; // before 'to'
            let toLabelStart = absStart + toIdxAbsRel + 2; // after 'to'
            let toLabelEnd = absStart + headRaw.length;

            // trim helper over inlineFullText
            const trimRange = (start: number, end: number): { start: number; end: number } => {
                let s = start;
                let e = end;
                while (s < e && /\s/.test(inlineFullText[s]!)) s += 1;
                while (e > s && /\s/.test(inlineFullText[e - 1]!)) e -= 1;
                return { start: s, end: e };
            };

            ({ start: fromLabelStart, end: fromLabelEnd } = trimRange(fromLabelStart, fromLabelEnd));
            ({ start: toLabelStart, end: toLabelEnd } = trimRange(toLabelStart, toLabelEnd));

            // title は from の手前まで
            const ttl = sliceInline(headTitleStartInline, absStart + relFromIdx);
            titleInline = mdastToString(toParagraph(ttl)).trim() === '' ? titleInline : ttl;
            destination = {
                kind: 'fromTo',
                from: removeNewlinesInTextNodes(sliceInline(fromLabelStart, fromLabelEnd)),
                to: removeNewlinesInTextNodes(sliceInline(toLabelStart, toLabelEnd)),
            } as ParsedHeader['destination'];
            positions.destination = { from: { start: fromLabelStart, end: fromLabelEnd }, to: { start: toLabelStart, end: toLabelEnd } };
        }
    }

    // タイトル最終決定: no-sep かつ dashPair のときは title=null（ルート解釈）。
    // それ以外では、mdInline から抽出できなければ text ベースの head.title をフォールバックに使う。
    const title = ((): PhrasingContent[] | null => {
        if (destination?.kind === 'dashPair' && sep === null) return null;
        if (titleInline && titleInline.length > 0) return titleInline;
        if (head.title && mdastToString(toParagraph(head.title)).trim() !== '') return head.title;
        // 省略記法: タイトルが空なら常に eventType をタイトルにする
        if (head.eventType && head.eventType.trim() !== '') {
            const cap = head.eventType.slice(0, 1).toUpperCase() + head.eventType.slice(1);
            return [{ type: 'text', value: cap } as unknown as PhrasingContent];
        }
        return null;
    })();
    if (titleInline) positions.title = { start: headTitleStartInline, end: headEndInline };
    return { eventType: head.eventType, title, time: ts.time, destination, positions };
}
