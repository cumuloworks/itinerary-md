//
import type React from 'react';
import { useMemo } from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase, formatCurrency } from '../../utils/currency';
import { isAllowedHref } from '../../utils/url';
import { IconLabelText } from './IconLabelText';
import { getMetadataConfig } from './iconMaps';
import type { TextSegment } from './SegmentedText';

// getMetadataConfig は共通モジュールから利用

export const Meta: React.FC<{
    metadata?: Record<string, string>;
    entries?: Array<{ key: string; segments: TextSegment[] }>;
    borderColor: string;
    currency?: string;
    priceInfos?: Array<{ key: string; currency: string; amount: number }>;
}> = ({ metadata = {}, entries: entriesProp, currency, priceInfos }) => {
    const entries = entriesProp
        ? entriesProp.map((e) => [e.key, e.segments.map((s) => s.text).join('')] as [string, string])
        : Object.entries(metadata).filter(([key]) => !key.endsWith('__url') && !key.endsWith('__link_label') && !key.endsWith('__segments'));
    const { data: ratesData } = useRatesUSD();

    const converted = useMemo(() => {
        if (!currency || !Array.isArray(priceInfos) || priceInfos.length === 0) return null;
        const rates = ratesData?.rates;
        const to = currency;
        const buildFor = (k: 'cost' | 'price'): string | undefined => {
            const items = (priceInfos || []).filter((p) => p.key === k);
            if (items.length === 0) return undefined;
            let sum = 0;
            for (const p of items) {
                const from = p.currency || to;
                if (!rates) {
                    if (from === to) sum += p.amount;
                    continue;
                }
                if (from === to) sum += p.amount;
                else {
                    const cv = convertAmountUSDBase(p.amount, from, to, rates);
                    if (cv != null) sum += cv;
                }
            }
            if (sum <= 0) return undefined;
            const originals = items.map((p) => formatCurrency(p.amount, p.currency));
            const anyConverted = Boolean(rates) && items.some((p) => (p.currency || to) !== to);
            const base = formatCurrency(sum, to);
            return anyConverted ? `${base} (${originals.join(' + ')})` : base;
        };
        const cost = buildFor('cost');
        const price = buildFor('price');
        return cost || price ? { cost, price } : null;
    }, [currency, priceInfos, ratesData]);

    if (entries.length === 0) return null;
    return (
        <div className={`flex flex-wrap gap-x-2`}>
            {entries.map(([key, value], idx) => {
                const config = getMetadataConfig(key);
                const IconComponent = config.icon;
                if (config.isSpecial) {
                    const display = key === 'cost' ? converted?.cost : key === 'price' ? converted?.price : undefined;
                    if (!display) return null;
                    return (
                        <IconLabelText key={key} icon={IconComponent} label={undefined} segments={[{ text: display }]} className="text-emerald-600 text-sm font-bold flex items-center" iconSize={14} iconClassName="mr-1" textClassName="" />
                    );
                }
                const segments: TextSegment[] = (() => {
                    if (Array.isArray(entriesProp)) {
                        const found = entriesProp[idx];
                        if (found && found.key === key) return found.segments;
                    }
                    const segmentsJson = metadata?.[`${key}__segments` as keyof typeof metadata] as unknown as string | undefined;
                    if (segmentsJson) {
                        try {
                            return JSON.parse(segmentsJson);
                        } catch {}
                    }
                    const maybeUrl = metadata?.[`${key}__url` as keyof typeof metadata] as unknown as string | undefined;
                    if (maybeUrl && isAllowedHref(maybeUrl)) return [{ text: value, url: maybeUrl }];
                    return [{ text: value }];
                })();
                return <IconLabelText key={key} icon={IconComponent} label={config.label} segments={segments} />;
            })}
        </div>
    );
};
