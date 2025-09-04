import type { PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { sliceInlineNodes } from '../mdast';
import type { Services } from '../services';
import type { EventTime } from '../types';
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

function parseTimeToken(raw: string): { hh: number; mm: number; tz?: string | null; dayOffset?: number | null } | null {
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
    // 空ブラケットは none として許容
    if (startRaw === '') return { time: { kind: 'none' }, consumed: m[0].length } as const;
    // マーカー（am/pm）: 大文字小文字非依存
    const ls = startRaw.toLowerCase();
    const marker = ls === 'am' || ls === 'pm' ? (ls as 'am' | 'pm') : null;
    if (marker) return { time: { kind: 'marker', marker }, consumed: m[0].length } as const;
    // 時刻トークン
    const start = parseTimeToken(startRaw);
    const end = endRaw ? parseTimeToken(endRaw) : null;
    if (start && end)
        return {
            time: { kind: 'range', start: { hh: start.hh, mm: start.mm, tz: start.tz ?? null, dayOffset: start.dayOffset ?? null }, end: { hh: end.hh, mm: end.mm, tz: end.tz ?? null, dayOffset: end.dayOffset ?? null } },
            consumed: m[0].length,
        } as const;
    if (start && !end)
        return {
            time: { kind: 'point', start: { hh: start.hh, mm: start.mm, tz: start.tz ?? null, dayOffset: start.dayOffset ?? null } },
            consumed: m[0].length,
        } as const;
    // 無効な内容（例: [!NOTE]）は時間としては未検出扱い
    return { time: null, consumed: 0 } as const;
}

// ヘッダ抽出時、改行が単語内に入るケースを許容するため、テキストノード内の改行のみ除去する
// 改行正規化（統一仕様）:
// - 単語中（前後が英数字）の改行は削除
// - それ以外の改行はスペース化（CommonMark のソフト改行挙動に寄せる）
function normalizeSoftBreaksInTextNodes(nodes: PhrasingContent[]): PhrasingContent[] {
    const isWordChar = (ch: string | undefined): boolean => !!ch && /[A-Za-z0-9]/.test(ch);
    const getFirstTextChar = (arr: PhrasingContent[], fromIdx: number): string | undefined => {
        for (let i = fromIdx; i < arr.length; i += 1) {
            const n = arr[i] as unknown as { type?: string; value?: string };
            if (n.type === 'text' && typeof n.value === 'string') {
                if (n.value.length > 0) return n.value[0];
            }
            // 非テキストの場合はスキップして次へ
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
                // 単語中の改行は削除
                // 何も追加しない
            } else {
                // それ以外はスペース
                out += ' ';
            }
        }
        return { ...t, value: out } as unknown as PhrasingContent;
    });
}

function splitHeadAndDestUsingSeps(line: string, tokens: LexTokens, consumed: number): { headRaw: string; destRaw: string | null; sep: 'doublecolon' | 'at' | 'from' | null } {
    const lower = line.toLowerCase();
    type SepKind = 'doublecolon' | 'at' | 'from';
    const seps = (tokens.seps || []).filter((s) => s.kind === 'doublecolon' || s.kind === 'at' || s.kind === 'from') as Array<{ kind: SepKind; index: number }>;

    // トークン列から、使用可能な最初のセパレータを決定
    let chosen: { kind: SepKind; rawIdx: number } | null = null;
    const sorted = seps.filter((s) => s.index >= consumed).sort((a, b) => a.index - b.index);
    for (const s of sorted) {
        const rawIdxWord = tokens.map(s.index); // 実文字列における先頭位置
        if (s.kind === 'from') {
            // 既存挙動に合わせて ' from '（前後スペース必須）かつ後続に ' to ' が存在する場合のみ有効化
            const hasLeadingSpace = rawIdxWord > 0 && lower[rawIdxWord - 1] === ' ';
            const hasTrailingSpace = lower[rawIdxWord + 4] === ' ';
            if (!(hasLeadingSpace && hasTrailingSpace)) continue;
            const toIdx = lower.indexOf(' to ', rawIdxWord + 5);
            if (toIdx < 0) continue;
            // head 側の rawIdx は先行スペースの位置に合わせる
            chosen = { kind: 'from', rawIdx: rawIdxWord - 1 };
            break;
        }
        // '::' / 'at' はそのまま採用
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
    const pickInline = (start: number, end: number): PhrasingContent[] => normalizeSoftBreaksInTextNodes(sliceInline(start, end).filter((n) => mdastToString(toParagraph([n])).trim() !== ''));

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
        if ((tm[1] || '').toLowerCase() === 'am' || (tm[1] || '').toLowerCase() === 'pm') {
            positions.time = { ...(positions.time || {}), marker: { start: firstStart, end: firstEnd } };
        }
    }
    if (destRaw) {
        // 先に headEnd 以降での一致を探し、見つからなければ全文から検索
        let destStartInline = inlineFullText.indexOf(destRaw, headEndInline);
        if (destStartInline < 0) destStartInline = inlineFullText.indexOf(destRaw);
        const destEndInline = destStartInline >= 0 ? destStartInline + destRaw.length : inlineFullText.length;
        const idx = destRaw.lastIndexOf(' - ');
        const lowerDest = destRaw.toLowerCase();
        let handledFromTo = false;
        // 明示的に 'from' セパレータが使われた場合は 'X to Y' を優先
        if (!destination && sep === 'from') {
            const toIdxRel = lowerDest.indexOf(' to ');
            if (toIdxRel >= 0) {
                const fromStart = destStartInline;
                const fromEnd = destStartInline + toIdxRel;
                const toStart = destStartInline + toIdxRel + ' to '.length;
                const toEnd = destEndInline;
                destination = {
                    kind: 'fromTo',
                    from: pickInline(fromStart, fromEnd),
                    to: pickInline(toStart, toEnd),
                } as ParsedHeader['destination'];
                positions.destination = { from: { start: fromStart, end: fromEnd }, to: { start: toStart, end: toEnd } };
                handledFromTo = true;
            }
        }
        // 一般的な ' from X to Y ' 構文の検出（前後スペース必須）
        if (!destination && !handledFromTo) {
            const fromIdxRel = lowerDest.indexOf(' from ');
            if (fromIdxRel >= 0) {
                const toIdxRel = lowerDest.indexOf(' to ', fromIdxRel + ' from '.length);
                if (toIdxRel >= 0) {
                    const fromStart = destStartInline + fromIdxRel + ' from '.length; // after ' from '
                    const fromEnd = destStartInline + toIdxRel; // before ' to '
                    const toStart = destStartInline + toIdxRel + ' to '.length; // after ' to '
                    const toEnd = destEndInline;
                    destination = {
                        kind: 'fromTo',
                        from: pickInline(fromStart, fromEnd),
                        to: pickInline(toStart, toEnd),
                    } as ParsedHeader['destination'];
                    positions.destination = { from: { start: fromStart, end: fromEnd }, to: { start: toStart, end: toEnd } };
                    handledFromTo = true;
                }
            }
        }
        if (!destination && idx >= 0) {
            const fromStart = destStartInline;
            const fromEnd = destStartInline + idx;
            const toStart = destStartInline + idx + 3;
            const toEnd = destEndInline;
            destination = {
                kind: 'dashPair',
                from: normalizeSoftBreaksInTextNodes(sliceInline(fromStart, fromEnd)),
                to: normalizeSoftBreaksInTextNodes(sliceInline(toStart, toEnd)),
            } as ParsedHeader['destination'];
            positions.destination = { from: { start: fromStart, end: fromEnd }, to: { start: toStart, end: toEnd } };
        } else if (sep === 'doublecolon' || sep === 'at') {
            destination = {
                kind: 'single',
                at: normalizeSoftBreaksInTextNodes(sliceInline(destStartInline, destEndInline)),
            } as ParsedHeader['destination'];
            positions.destination = { at: { start: destStartInline, end: destEndInline } };
        }
    }

    // タイトル最終決定: no-sep かつ dashPair のときは title=null（ルート解釈）。
    // それ以外では、mdInline から抽出できなければ text ベースの head.title をフォールバックに使う。
    const title = ((): PhrasingContent[] | null => {
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
