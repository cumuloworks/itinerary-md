// 日付は itmdHeading ノードから取得する
import { ArrowDown, BedDouble, FerrisWheel, Plane } from 'lucide-react';
import React from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase, parseAmountWithCurrency } from '../../utils/currency';

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
    rate?: { from: string; to: string; value: number };
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
    if (['flight', 'train', 'drive', 'ferry', 'bus', 'taxi', 'subway', 'cablecar', 'rocket', 'spaceship'].includes(eventType)) return 'transportation';
    if (['stay', 'hotel', 'ryokan', 'hostel', 'dormitory'].includes(eventType)) return 'stay';
    return 'activity';
};

export const Statistics: React.FC<StatisticsProps> = ({ root, frontmatter, currency, rate }) => {
    const { data: ratesData } = useRatesUSD();

    const summary = React.useMemo(() => extractHeadingDates(root?.children), [root]);

    const { total, totalFormatted, breakdownFormatted, toCurrency } = React.useMemo(() => {
        // 通貨コードを props/frontmatter から抽出し、文字列化→大文字化→トリム→3文字化→検証
        const rawCurrency = (currency ?? (typeof frontmatter?.currency === 'string' ? (frontmatter?.currency as string) : undefined)) as unknown;
        const normalizedCandidate = String(rawCurrency ?? 'USD')
            .toUpperCase()
            .trim()
            .slice(0, 3);
        const VALID_CODE = /^[A-Z]{3}$/;
        const toCurrency = VALID_CODE.test(normalizedCandidate) ? normalizedCandidate : 'USD';
        const applyManualRate = (amount: number, from: string, to: string): number | null => {
            if (from === to) return amount;
            const r = rate;
            if (r && typeof r.value === 'number') {
                const fromCode = String(r.from || '')
                    .toUpperCase()
                    .trim()
                    .slice(0, 3);
                const toCode = String(r.to || '')
                    .toUpperCase()
                    .trim()
                    .slice(0, 3);
                if (fromCode && toCode && fromCode === from && toCode === to && r.value > 0) {
                    return amount * r.value;
                }
            }
            return null;
        };
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
                // 1) 手動rate適用（優先） 2) API rates 3) 1:1
                converted = applyManualRate(amt, from, to);
                if (converted == null) {
                    if (from === to) {
                        converted = amt;
                    } else if (ratesData) {
                        const hasFrom = typeof ratesData.rates[from] === 'number';
                        const hasTo = typeof ratesData.rates[to] === 'number';
                        if (hasFrom && hasTo) {
                            converted = convertAmountUSDBase(amt, from, to, ratesData.rates);
                        } else {
                            converted = amt; // 1:1 フォールバック
                        }
                    } else {
                        converted = amt;
                    }
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
            total,
            toCurrency,
            totalFormatted: total > 0 ? formatter.format(total) : null,
            breakdownFormatted: total > 0 ? { transportation: formatter.format(transportation), activity: formatter.format(activity), stay: formatter.format(stay) } : null,
        } as { total: number; toCurrency: string; totalFormatted: string | null; breakdownFormatted: { transportation: string; activity: string; stay: string } | null };
    }, [root, frontmatter, currency, ratesData, rate]);

    const budgetDisplay = React.useMemo(() => {
        // frontmatter.budget から金額とコードを抽出
        const raw = frontmatter?.budget as unknown;
        let parsed: { amount: number | null; currency?: string; raw: string } | null = null;
        if (typeof raw === 'number') parsed = parseAmountWithCurrency(String(raw), undefined);
        else if (typeof raw === 'string') parsed = parseAmountWithCurrency(raw, undefined);
        if (!parsed || parsed.amount == null || parsed.amount <= 0) return null;
        const from = String(parsed.currency || toCurrency || 'USD')
            .toUpperCase()
            .trim()
            .slice(0, 3);
        const amt = parsed.amount;
        // 変換（手動→API→1:1）
        let converted: number | null = null;
        const manual = rate;
        if (manual && manual.value > 0) {
            const mFrom = String(manual.from || '')
                .toUpperCase()
                .trim()
                .slice(0, 3);
            const mTo = String(manual.to || '')
                .toUpperCase()
                .trim()
                .slice(0, 3);
            if (mFrom && mTo && mFrom === from && mTo === toCurrency) {
                converted = amt * manual.value;
            }
        }
        if (converted == null) {
            if (from === toCurrency) converted = amt;
            else if (ratesData?.rates?.[from] && ratesData?.rates?.[toCurrency]) converted = convertAmountUSDBase(amt, from, toCurrency, ratesData.rates) ?? amt;
            else converted = amt;
        }
        const fmt = (() => {
            try {
                return new Intl.NumberFormat(undefined, { style: 'currency', currency: toCurrency, currencyDisplay: 'narrowSymbol' });
            } catch {
                return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
            }
        })();
        const budgetFormatted = fmt.format(converted);
        const remaining = converted - (total || 0);
        const remainingFormatted = fmt.format(Math.abs(remaining));
        const remainingLabel = remaining >= 0 ? `${remainingFormatted} left` : `${remainingFormatted} over`;
        const usedPct = converted > 0 ? Math.min(999, Math.max(0, Math.round(((total || 0) / converted) * 100))) : 0;
        return { budgetFormatted, remaining, remainingLabel, usedPct } as {
            budgetFormatted: string;
            remaining: number;
            remainingLabel: string;
            usedPct: number;
        };
    }, [frontmatter, toCurrency, total, ratesData, rate]);

    return (
        <div className="flex flex-wrap justify-evenly py-4 rounded bg-gray-50 border border-gray-300">
            <div className="basis-1/2 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-emerald-600" aria-live="polite">
                    {totalFormatted ?? '—'}
                </div>
                <div className="w-full px-4 mt-2">
                    {budgetDisplay && (
                        <div className="flex items-center justify-center text-xs text-gray-700 gap-2 mb-4">
                            <span className="font-semibold">Budget:</span>
                            <span className="font-semibold">{budgetDisplay.budgetFormatted}</span>
                            <span className={budgetDisplay.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}>({budgetDisplay.remainingLabel})</span>
                            <span className="text-gray-500">{budgetDisplay.usedPct}% used</span>
                        </div>
                    )}
                    <div className="flex justify-center gap-x-10 text-center">
                        <div className="flex flex-col items-center flex-1">
                            <div className="flex items-center gap-1">
                                <Plane size={20} className="text-gray-600" />
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.transportation ?? '—'}</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <FerrisWheel size={20} className="text-gray-600" />
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
