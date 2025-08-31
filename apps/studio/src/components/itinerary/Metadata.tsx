import type { LucideIcon } from 'lucide-react';
import { Bed, Calendar, Car, Clock, MapPin, Phone, Plane, Star, Tag, Users, Wallet, Wifi } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useRatesUSD } from '../../hooks/useRatesUSD';
import { convertAmountUSDBase, formatCurrency, parseAmountWithCurrency } from '../../utils/currency';

const getMetadataConfig = (key: string) => {
    const configs: Record<string, { icon: LucideIcon; label: string; isSpecial?: boolean }> = {
        cost: { icon: Wallet, label: '', isSpecial: true },
        price: { icon: Wallet, label: '', isSpecial: true },
        seat: { icon: Users, label: 'Seat' },
        room: { icon: Bed, label: 'Room' },
        guests: { icon: Users, label: 'Guests' },
        aircraft: { icon: Plane, label: 'Aircraft' },
        vehicle: { icon: Car, label: 'Vehicle' },
        location: { icon: MapPin, label: 'Location' },
        addr: { icon: MapPin, label: 'Address' },
        phone: { icon: Phone, label: 'Phone' },
        wifi: { icon: Wifi, label: 'WiFi' },
        rating: { icon: Star, label: 'Rating' },
        reservation: { icon: Calendar, label: 'Reservation' },
        checkin: { icon: Clock, label: 'Check-in' },
        checkout: { icon: Clock, label: 'Check-out' },
        tag: { icon: Tag, label: 'Tag' },
        cuisine: { icon: Tag, label: 'Cuisine' },
        note: { icon: Tag, label: 'Note' },
        desc: { icon: Tag, label: 'Description' },
        text: { icon: Tag, label: 'Text' },
    };
    return configs[key] || { icon: Tag, label: key };
};

export const Meta: React.FC<{
    metadata: Record<string, string>;
    borderColor: string;
    currency?: string;
}> = ({ metadata, borderColor, currency }) => {
    const entries = Object.entries(metadata);
    const { data: ratesData } = useRatesUSD();

    const converted = useMemo(() => {
        if (!currency) {
            return null;
        }

        // ratesDataが利用可能でない場合、元の値をそのまま使用
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
                return (
                    <div key={key} className="text-gray-600 text-sm flex items-center">
                        <IconComponent size={14} className="mr-1" />
                        <span className="font-medium">{config.label}:</span>
                        <span className="ml-1">{value}</span>
                    </div>
                );
            })}
        </div>
    );
};
