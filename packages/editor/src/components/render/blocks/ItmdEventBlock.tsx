import { DateTime } from 'luxon';
import type { PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type React from 'react';
import { EventBlock } from '@/components/itinerary/EventBlock';
import { mergeClassNames } from '@/components/render/utils';

export const ItmdEventBlock: React.FC<{
    node: any;
    commonDataProps: any;
    getNodeDateAttr: (n: any) => string | undefined;
    displayTimezone: string;
    currency?: string;
    inlineToSegments: (inline?: PhrasingContent[] | null) => Array<{ text: string; url?: string; kind?: 'text' | 'code' }> | undefined;
    segmentsToPlainText: (segments?: Array<{ text: string; url?: string }>) => string | undefined;
    preferAltNames?: boolean;
}> = ({ node, commonDataProps, getNodeDateAttr, displayTimezone, currency, inlineToSegments, segmentsToPlainText, preferAltNames }) => {
    const nodeDateAttr = getNodeDateAttr(node);
    const ev = node as any;
    const dateInfo = nodeDateAttr ? { date: nodeDateAttr } : undefined;
    const effectiveTitle = ((): PhrasingContent[] | null | undefined => {
        const primary = ev.title as PhrasingContent[] | null | undefined;
        const alt = ev.title_alt as PhrasingContent[] | null | undefined;
        if (preferAltNames && Array.isArray(alt) && alt.length > 0) return alt;
        return primary;
    })();
    const nameSegmentsRaw = inlineToSegments(effectiveTitle);
    const nameSegments = Array.isArray(nameSegmentsRaw) && nameSegmentsRaw.length > 0 ? nameSegmentsRaw : undefined;
    const nameText = (() => {
        try {
            if (Array.isArray(ev.title)) {
                const pseudo = { type: 'paragraph', children: ev.title } as any;
                const s = mdastToString(pseudo);
                if (typeof s === 'string' && s.trim()) return s.trim();
            }
        } catch {}
        const plain = segmentsToPlainText(nameSegments);
        return plain?.trim() || '';
    })();
    const baseType = (ev as { baseType?: 'transportation' | 'stay' | 'activity' }).baseType ?? 'activity';
    const t = ev.eventType as string;
    const destSegments = (() => {
        const d = ev.destination as any;
        if (!d) return undefined;
        if (d.kind === 'fromTo' || d.kind === 'dashPair') {
            const from = inlineToSegments(preferAltNames ? d.from_alt || d.from : d.from) || [];
            const to = inlineToSegments(preferAltNames ? d.to_alt || d.to : d.to) || [];
            type Segment = { text: string; url?: string; kind?: 'text' | 'code' };
            const viasSrc: any[] = Array.isArray(d.vias) ? d.vias : [];
            const vias = viasSrc.map((v) => inlineToSegments(v) || []).filter((segArr: Segment[]): segArr is Segment[] => Array.isArray(segArr) && segArr.length > 0);
            return vias.length > 0 ? { kind: d.kind, from, to, vias } : { kind: d.kind, from, to };
        }
        if (d.kind === 'single') {
            const at = inlineToSegments(preferAltNames ? d.at_alt || d.at : d.at) || [];
            return { kind: 'single', at };
        }
        return undefined;
    })();
    const metadata: Record<string, string> = {};
    const bodySegments = (() => {
        const body = (ev as any).body as Array<any> | undefined;
        if (!Array.isArray(body)) return undefined;
        const segs: Array<any> = [];
        for (const s of body) {
            if (!s || typeof s !== 'object') continue;
            if (s.kind === 'inline') {
                const inline = Array.isArray(s.content) ? (s.content as PhrasingContent[]) : [];
                const seg = inlineToSegments(inline) || [];
                if (seg.length > 0) segs.push({ kind: 'inline', segments: seg });
            } else if (s.kind === 'meta') {
                const m = s.entries as Array<{ key: string; value: PhrasingContent[] }> | undefined;
                const entries: Array<{
                    key: string;
                    segments: Array<{ text: string; url?: string }>;
                }> = [];
                for (const e of m || []) {
                    const seg = inlineToSegments(e.value) || [];
                    if (e.key) entries.push({ key: e.key, segments: seg });
                }
                if (entries.length > 0) segs.push({ kind: 'meta', entries });
            } else if (s.kind === 'list') {
                const items = Array.isArray(s.items) ? (s.items as PhrasingContent[][]) : [];
                const listSegs = items.map((inline) => inlineToSegments(inline) || []);
                const ordered = !!(s as any).ordered;
                const start = typeof (s as any).start === 'number' ? ((s as any).start as number) : undefined;
                if (listSegs.length > 0) segs.push({ kind: 'list', items: listSegs, ordered, start });
            }
        }
        return segs.length > 0 ? segs : undefined;
    })();
    const timeKind = ev.time?.kind as 'marker' | 'point' | 'range' | 'none' | undefined;
    const startISO = timeKind === 'point' || timeKind === 'range' ? ((ev.time as any)?.startISO as string | undefined) : undefined;
    const endISO = timeKind === 'range' ? ((ev.time as any)?.endISO as string | undefined) : undefined;
    const marker = timeKind === 'marker' ? ((ev.time as any)?.marker as 'am' | 'pm' | undefined) : undefined;
    const itmdPrice = (
        ev as unknown as {
            data?: {
                itmdPrice?: Array<{
                    key: string;
                    raw: string;
                    price: { tokens?: Array<any>; warnings?: string[] };
                }>;
            };
        }
    ).data?.itmdPrice as Array<{ key: string; raw: string; price: { tokens?: Array<any>; warnings?: string[] } }> | undefined;
    const priceInfos: Array<{ key: string; currency: string; amount: number }> | undefined = (() => {
        if (!Array.isArray(itmdPrice)) return undefined;
        const out: Array<{ key: string; currency: string; amount: number }> = [];
        for (const p of itmdPrice) {
            const tok = Array.isArray(p.price?.tokens) ? p.price.tokens[0] : undefined;
            if (!tok || tok.kind !== 'money') continue;
            const cur = String(tok.normalized?.currency || tok.currency || '').toUpperCase();
            const amtStr = String(tok.normalized?.amount || tok.amount || '');
            const amt = Number(amtStr);
            if (!cur || !Number.isFinite(amt)) continue;
            out.push({ key: p.key, currency: cur, amount: amt });
        }
        return out.length > 0 ? out : undefined;
    })();

    // price warnings are aggregated by key below

    const priceWarningsByKey: Record<string, string[]> | undefined = (() => {
        if (!Array.isArray(itmdPrice)) return undefined;
        const out: Record<string, string[]> = {};
        for (const p of itmdPrice) {
            const key = String(p.key || '').toLowerCase();
            if (!key) continue;
            const ws = (Array.isArray(p.price?.warnings) ? (p.price?.warnings as string[]) : []).filter(
                (w) => w === 'math-eval-failed' || w === 'math-eval-error' || w === 'currency-not-detected' || w === 'amount-not-detected' || w === 'no-amount' || w === 'unrecognized'
            );
            if (ws.length === 0) continue;
            out[key] = Array.from(new Set([...(out[key] || []), ...ws]));
        }
        return Object.keys(out).length > 0 ? out : undefined;
    })();

    const eventData = {
        baseType,
        type: t,
        name: nameText || undefined,
        destination: destSegments,
        metadata,
    } as any;

    const dateStrForDisplay = (dateInfo?.date as string | undefined) ?? (startISO ? DateTime.fromISO(startISO, { zone: displayTimezone }).toISODate() || undefined : undefined);

    const { className: extraClass, ...rest } = commonDataProps || {};
    const mergedClassName = mergeClassNames('contents', extraClass as string | undefined);
    return (
        <div className={mergedClassName} {...rest}>
            <EventBlock
                eventData={eventData}
                dateStr={dateStrForDisplay}
                timezone={displayTimezone}
                currency={currency}
                priceInfos={priceInfos}
                priceWarningsByKey={priceWarningsByKey}
                nameSegments={nameSegments}
                startISO={startISO ?? null}
                endISO={endISO ?? null}
                marker={marker ?? null}
                bodySegments={bodySegments}
            />
        </div>
    );
};
