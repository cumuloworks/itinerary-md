import type { LucideIcon } from 'lucide-react';
import { Bed, Calendar, Car, Clock, MapPin, Phone, Plane, Star, Tag, Users, Wallet, Wifi } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase, formatCurrency, parseAmountWithCurrency } from '../../utils/currency';
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
    metadata: Record<string, string>;
    borderColor: string;
    currency?: string;
}> = ({ metadata, borderColor, currency }) => {
    const entries = Object.entries(metadata).filter(([key]) => !key.endsWith('__url') && !key.endsWith('__link_label') && !key.endsWith('__segments'));
    const { data: ratesData } = useRatesUSD();

    const converted = useMemo(() => {
        if (!currency) {
            return null;
        }

        if (!ratesData) {
            const out: Record<string, string> = {};
            for (const [key, value] of entries) {
                if (key !== 'cost' && key !== 'price') continue;
                out[key] = value;
            }
            return Object.keys(out).length ? out : null;
        }

        const { rates } = ratesData;
        const out: Record<string, string> = {};
        for (const [key, value] of entries) {
            if (key !== 'cost' && key !== 'price') continue;
            const parsed = parseAmountWithCurrency(value, currency);
            if (parsed.amount == null) continue;
            const from = parsed.currency || currency;
            const to = currency;
            if (from === to) {
                out[key] = formatCurrency(parsed.amount, to);
                continue;
            }
            const cv = convertAmountUSDBase(parsed.amount, from, to, rates);
            if (cv == null) continue;
            out[key] = `${formatCurrency(cv, to)} (${value})`;
        }
        return Object.keys(out).length ? out : null;
    }, [currency, entries, ratesData]);

    if (entries.length === 0) return null;
    return (
        <div className={`flex flex-wrap gap-x-4 mt-2 pt-2 border-t ${borderColor}`}>
            {entries.map(([key, value]) => {
                const config = getMetadataConfig(key);
                const IconComponent = config.icon;
                if (config.isSpecial) {
                    return (
                        <div key={key} className="text-emerald-600 text-sm font-bold flex items-center">
                            <IconComponent size={14} className="mr-1" />
                            <span>{converted?.[key] ?? value}</span>
                        </div>
                    );
                }
                                const segments: TextSegment[] = (() => {
                                        const segmentsJson = metadata[`${key}__segments`];
                    if (segmentsJson) {
                        try {
                            return JSON.parse(segmentsJson);
                        } catch {
                                                    }
                    }

                                        const maybeUrl = metadata[`${key}__url`];
                    if (maybeUrl && isAllowedHref(maybeUrl)) {
                        return [{ text: value, url: maybeUrl }];
                    }
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
