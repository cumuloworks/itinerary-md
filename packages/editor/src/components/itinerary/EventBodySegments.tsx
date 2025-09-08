import type React from 'react';
import { Meta } from '@/components/itinerary/Metadata';
import { Price } from '@/components/itinerary/Price';
import { SegmentedText } from '@/components/itinerary/SegmentedText';
import { useRatesUSD } from '@/hooks/useRatesUSD';
import { formatConvertedPreferred } from '@/utils/currency';

export const EventBodySegments: React.FC<{
    bodySegments?: Array<
        | { kind: 'inline'; segments: Array<{ text: string; url?: string }> }
        | { kind: 'meta'; entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> }
        | { kind: 'list'; items: Array<Array<{ text: string; url?: string }>>; ordered?: boolean; start?: number | null }
    >;
    borderClass: string;
    priceWarningsByKey?: Record<string, string[]>;
    priceInfos?: Array<{ key: string; currency: string; amount: number }>;
    toCurrency?: string;
}> = ({ bodySegments, borderClass, priceWarningsByKey, priceInfos, toCurrency }) => {
    const { data: ratesData } = useRatesUSD();
    if (!Array.isArray(bodySegments) || bodySegments.length === 0) return null;
    return (
        <div className={`mt-2 pt-2 border-t ${borderClass}`}>
            {bodySegments.map((seg, idx) => {
                if (!seg) return null;
                if ((seg as { kind?: string }).kind === 'inline') {
                    const s = seg as { kind: 'inline'; segments: Array<{ text: string; url?: string }> };
                    if (!Array.isArray(s.segments) || s.segments.length === 0) return null;
                    const key = `inline-${s.segments
                        .map((x) => `${x.text}-${x.url ?? ''}`)
                        .join('|')
                        .slice(0, 64)}-${idx}`;
                    return <SegmentedText key={key} segments={s.segments} className="block text-gray-700 text-sm mb-1" linkClassName="underline text-inherit" />;
                }
                if ((seg as { kind?: string }).kind === 'meta') {
                    const m = seg as { kind: 'meta'; entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> };
                    const priceEntries = (m.entries || []).filter((e) => e && (e.key === 'price' || e.key === 'cost'));
                    const restEntries = (m.entries || []).filter((e) => !e || (e.key !== 'price' && e.key !== 'cost'));
                    if (priceEntries.length > 0) {
                        const infoByKey = (() => {
                            const map: Record<string, { currency: string; amount: number }> = {};
                            for (const p of priceInfos || []) {
                                const k = String(p.key || '').toLowerCase();
                                if (!k) continue;
                                map[k] = { currency: p.currency, amount: p.amount };
                            }
                            return map;
                        })();
                        const metaKeyStable = `meta-${priceEntries
                            .map((e) => e.key)
                            .join('|')
                            .slice(0, 64)}-${restEntries
                            .map((e) => e.key)
                            .join('|')
                            .slice(0, 64)}`;
                        return (
                            <div key={metaKeyStable} className="flex flex-wrap gap-x-2">
                                {priceEntries.map((e) => {
                                    const kind = (e.key === 'price' ? 'price' : 'cost') as 'price' | 'cost';
                                    const warns = priceWarningsByKey?.[kind];
                                    const segKey = `${kind}-${e.segments
                                        .map((s) => `${s.text}-${s.url ?? ''}`)
                                        .join('|')
                                        .slice(0, 64)}`;
                                    const info = infoByKey[String(kind)];
                                    let display = undefined as string | undefined;
                                    if (info) {
                                        const from = String(info.currency || '').toUpperCase();
                                        const to = String(toCurrency || '').toUpperCase();
                                        display = formatConvertedPreferred(info.amount, from, to, ratesData?.rates);
                                    }
                                    return <Price key={segKey} kind={kind} segments={e.segments} warnings={warns} display={display} />;
                                })}
                                {restEntries.length > 0 ? <Meta entries={restEntries} metadata={{}} /> : null}
                            </div>
                        );
                    }
                    const key = `meta-${restEntries
                        .map((e) => e.key)
                        .join('|')
                        .slice(0, 64)}-${idx}`;
                    return <Meta key={key} entries={restEntries} metadata={{}} />;
                }
                if ((seg as { kind?: string }).kind === 'list') {
                    const l = seg as { kind: 'list'; items: Array<Array<{ text: string; url?: string }>>; ordered?: boolean; start?: number | null };
                    if (!Array.isArray(l.items) || l.items.length === 0) return null;
                    const isOrdered = !!l.ordered;
                    const start = typeof l.start === 'number' ? l.start : undefined;
                    if (isOrdered) {
                        return (
                            <ol key={`list-${start ?? 'ol'}`} className="ml-6 list-decimal marker:text-blue-600 marker:font-bold marker:text-base" start={start}>
                                {l.items.map((it) => {
                                    const keyStr = it
                                        .map((seg) => `${seg.text}-${seg.url ?? ''}`)
                                        .join('|')
                                        .slice(0, 64);
                                    return (
                                        <li key={`li-${keyStr}`}>
                                            <SegmentedText segments={it} className="text-gray-700 text-sm" linkClassName="underline text-inherit" />
                                        </li>
                                    );
                                })}
                            </ol>
                        );
                    }
                    return (
                        <ul
                            key={`list-ul-${l.items.length}-${(l.items[0] || [])
                                .map((x) => x.text)
                                .join('-')
                                .slice(0, 16)}`}
                            className="ml-6 list-disc marker:text-blue-600 marker:font-bold marker:text-base"
                        >
                            {l.items.map((it) => {
                                const keyStr = it
                                    .map((seg) => `${seg.text}-${seg.url ?? ''}`)
                                    .join('|')
                                    .slice(0, 64);
                                return (
                                    <li key={`li-${keyStr}`}>
                                        <SegmentedText segments={it} className="text-gray-700 text-sm" linkClassName="underline text-inherit" />
                                    </li>
                                );
                            })}
                        </ul>
                    );
                }
                return null;
            })}
        </div>
    );
};

export default EventBodySegments;
