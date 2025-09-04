import type { LucideIcon } from 'lucide-react';
import { Bed, Calendar, Car, Clock, MapPin, Phone, Plane, Star, Tag, Users, Wallet, Wifi } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase, formatCurrency } from '../../utils/currency';
import { isAllowedHref } from '../../utils/url';
import { SegmentedText, type TextSegment } from './SegmentedText';

const getMetadataConfig = (key: string) => {
    const iconConfigs: Record<string, { icon: LucideIcon; isSpecial?: boolean }> = {
        cost: { icon: Wallet, isSpecial: true },
        price: { icon: Wallet, isSpecial: true },
        seat: { icon: Users },
        room: { icon: Bed },
        guests: { icon: Users },
        aircraft: { icon: Plane },
        vehicle: { icon: Car },
        location: { icon: MapPin },
        addr: { icon: MapPin },
        phone: { icon: Phone },
        wifi: { icon: Wifi },
        rating: { icon: Star },
        reservation: { icon: Calendar },
        checkin: { icon: Clock },
        checkout: { icon: Clock },
        tag: { icon: Tag },
        cuisine: { icon: Tag },
        note: { icon: Tag },
        desc: { icon: Tag },
        text: { icon: Tag },
    };
    const fallbackLabel = key
        .split(/[_\-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    const cfg = iconConfigs[key] || { icon: Tag };
    return { icon: cfg.icon, label: fallbackLabel, isSpecial: cfg.isSpecial };
};

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
        <div className={`flex flex-wrap gap-x-1`}>
            {entries.map(([key, value], idx) => {
                const config = getMetadataConfig(key);
                const IconComponent = config.icon;
                if (config.isSpecial) {
                    const display = key === 'cost' ? converted?.cost : key === 'price' ? converted?.price : undefined;
                    if (!display) return null;
                    return (
                        <div key={key} className="text-emerald-600 text-sm font-bold flex items-center">
                            <IconComponent size={14} className="mr-1" />
                            <span>{display}</span>
                        </div>
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

                return (
                    <div key={key} className="text-gray-600 text-sm flex items-center">
                        <IconComponent size={14} className="mr-1" />
                        <span className="font-medium">{config.label}:</span>
                        <SegmentedText segments={segments} className="ml-1" linkClassName="underline text-inherit" />
                    </div>
                );
            })}
        </div>
    );
};
