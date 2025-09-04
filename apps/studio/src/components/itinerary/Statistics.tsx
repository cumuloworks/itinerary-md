// 日付は itmdHeading ノードから取得する
import { ArrowDown, BedDouble, Plane, Ticket } from 'lucide-react';
import React from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase } from '../../utils/currency';

type MdNode = { type?: string; depth?: number; children?: unknown[]; position?: { start?: { line?: number }; end?: { line?: number } } };
type MoneyTokenLike = { kind?: string; currency?: string; amount?: string; normalized?: { currency?: string; amount?: string } };
type PriceEntryLike = { key: string; raw: string; price: { tokens?: Array<MoneyTokenLike> } };

interface ItmdEventNode {
    type: 'itmdEvent';
    eventType: string;
    data?: { itmdPrice?: Array<PriceEntryLike> } | null;
}

interface StatisticsProps {
    root?: { children?: MdNode[] } | null;
    frontmatter?: Record<string, unknown> | null;
    timezone?: string;
    currency?: string;
}

const extractHeadingDates = (nodes?: MdNode[]): { startDate?: string; endDate?: string; numDays?: number } => {
    if (!Array.isArray(nodes)) return {};
    const dates: string[] = [];
    for (const n of nodes) {
        if (!n) continue;
        if (n.type === 'itmdHeading' && typeof (n as { dateISO?: string }).dateISO === 'string') {
            dates.push((n as { dateISO: string }).dateISO);
        }
    }
    const uniq = Array.from(new Set(dates)).sort();
    const startDate = uniq[0];
    const endDate = uniq.length > 0 ? uniq[uniq.length - 1] : undefined;
    let numDays: number | undefined;
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (Number.isFinite(diff)) numDays = diff;
    }
    return { startDate, endDate, numDays };
};

// no fallback parser anymore

const classifyBaseType = (eventType: string): 'transportation' | 'activity' | 'stay' => {
    if (['flight', 'train', 'drive', 'ferry', 'bus', 'taxi', 'subway'].includes(eventType)) return 'transportation';
    if (['stay', 'hotel', 'ryokan', 'hostel', 'dormitory'].includes(eventType)) return 'stay';
    return 'activity';
};

export const Statistics: React.FC<StatisticsProps> = ({ root, frontmatter, currency }) => {
    const { data: ratesData } = useRatesUSD();

    const summary = React.useMemo(() => extractHeadingDates(root?.children), [root]);

    const { totalFormatted, breakdownFormatted } = React.useMemo(() => {
        // 通貨コードを props/frontmatter から抽出し、文字列化→大文字化→トリム→3文字化→検証
        const rawCurrency = (currency ?? (typeof frontmatter?.currency === 'string' ? (frontmatter?.currency as string) : undefined)) as unknown;
        const normalizedCandidate = String(rawCurrency ?? 'USD')
            .toUpperCase()
            .trim()
            .slice(0, 3);
        const VALID_CODE = /^[A-Z]{3}$/;
        const toCurrency = VALID_CODE.test(normalizedCandidate) ? normalizedCandidate : 'USD';
        let total = 0;
        let transportation = 0;
        let activity = 0;
        let stay = 0;
        const children = Array.isArray(root?.children) ? (root?.children as MdNode[]) : [];
        for (const node of children) {
            if ((node as { type?: string }).type !== 'itmdEvent') continue;
            const ev = node as unknown as ItmdEventNode;
            const baseType = classifyBaseType(ev.eventType);
            const prices = Array.isArray(ev.data?.itmdPrice) ? (ev.data?.itmdPrice as PriceEntryLike[]) : [];
            if (prices.length === 0) continue;
            const to = toCurrency;
            let eventSum = 0;
            for (const p of prices) {
                const tok = Array.isArray(p.price?.tokens) ? p.price.tokens[0] : undefined;
                if (!tok || tok.kind !== 'money') continue;
                // 入力側通貨も正規化・検証し、不正なら表示通貨にフォールバック
                const fromCandidate = String(tok.normalized?.currency || tok.currency || to)
                    .toUpperCase()
                    .trim()
                    .slice(0, 3);
                const from = VALID_CODE.test(fromCandidate) ? fromCandidate : to;
                const amt = Number(String(tok.normalized?.amount || tok.amount || ''));
                if (!Number.isFinite(amt)) continue;
                let converted: number | null = null;
                if (from === to) {
                    converted = amt;
                } else if (ratesData) {
                    // 必要レートが欠損している場合は 1:1 として加算（スキップしない）
                    const hasFrom = typeof ratesData.rates[from] === 'number';
                    const hasTo = typeof ratesData.rates[to] === 'number';
                    if (hasFrom && hasTo) {
                        converted = convertAmountUSDBase(amt, from, to, ratesData.rates);
                    } else {
                        converted = amt; // 1:1 フォールバック
                    }
                } else {
                    // レート自体が無い場合も 1:1 として扱う
                    converted = amt;
                }
                if (converted != null) eventSum += converted;
            }
            if (eventSum <= 0) continue;
            total += eventSum;
            if (baseType === 'transportation') transportation += eventSum;
            else if (baseType === 'activity') activity += eventSum;
            else if (baseType === 'stay') stay += eventSum;
        }
        // Intl.NumberFormat は RangeError の可能性があるため try/catch で USD にフォールバック
        let formatter: Intl.NumberFormat;
        try {
            formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: toCurrency, currencyDisplay: 'narrowSymbol' });
        } catch {
            formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
        }
        return {
            totalFormatted: total > 0 ? formatter.format(total) : null,
            breakdownFormatted: total > 0 ? { transportation: formatter.format(transportation), activity: formatter.format(activity), stay: formatter.format(stay) } : null,
        } as { totalFormatted: string | null; breakdownFormatted: { transportation: string; activity: string; stay: string } | null };
    }, [root, frontmatter, currency, ratesData]);

    return (
        <div className="flex flex-wrap justify-evenly py-4 rounded bg-gray-50 border border-gray-300">
            <div className="basis-1/2 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-emerald-600" aria-live="polite">
                    {totalFormatted ?? '—'}
                </div>
                <div className="w-full px-4 mt-2">
                    <div className="flex justify-center gap-x-10 text-center">
                        <div className="flex flex-col items-center flex-1">
                            <div className="flex items-center gap-1">
                                <Plane size={20} className="text-gray-600" />
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.transportation ?? '—'}</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <Ticket size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.activity ?? '—'}</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <BedDouble size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.stay ?? '—'}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="basis-1/2 p-4 rounded-lg flex flex-col items-center justify-center ">
                <div className="text-2xl whitespace-nowrap font-bold text-gray-800 flex flex-col justify-center items-center gap-1">
                    {summary.startDate && summary.endDate ? (
                        <>
                            <span>{summary.startDate}</span>
                            <div className="flex items-center gap-1">
                                <ArrowDown size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-600">{summary.numDays ? <span className="text-sm text-gray-600">{summary.numDays} days</span> : null}</span>
                            </div>
                            <span>{summary.endDate}</span>
                        </>
                    ) : (
                        <span>—</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Statistics;
