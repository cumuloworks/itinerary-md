import type { ItineraryEvent } from '@itinerary-md/core';
import { useEffect, useState } from 'react';
import { notifyError } from '../core/errors';
import { convertAmountUSDBase, getRatesUSD, parseAmountWithCurrency } from '../utils/currency';

type CostBreakdownFormatted = {
    transport: string;
    activity: string;
    meal: string;
};

export function useCostStatistics(events: ItineraryEvent[], currency: string) {
    const [loading, setLoading] = useState<boolean>(false);
    const [totalFormatted, setTotalFormatted] = useState<string | null>(null);
    const [breakdownFormatted, setBreakdownFormatted] = useState<CostBreakdownFormatted | null>(null);

    useEffect(() => {
        let mounted = true;
        const calc = async () => {
            setLoading(true);
            try {
                const { rates } = await getRatesUSD();

                let total = 0;
                let transport = 0;
                let activity = 0;
                let meal = 0;

                for (const { event } of events) {
                    const costValue = event.metadata.cost || event.metadata.price;
                    if (!costValue) continue;

                    const parsed = parseAmountWithCurrency(costValue, currency);
                    if (parsed.amount == null) continue;

                    const from = parsed.currency || currency;
                    const to = currency;
                    const converted = from === to ? parsed.amount : convertAmountUSDBase(parsed.amount, from, to, rates);
                    if (converted == null) continue;

                    total += converted;

                    if (event.baseType === 'transportation') {
                        transport += converted;
                    } else if (event.baseType === 'activity') {
                        const isMeal = event.type === 'meal' || event.type === 'lunch' || event.type === 'dinner' || event.type === 'breakfast' || event.type === 'brunch';
                        if (isMeal) {
                            meal += converted;
                        } else {
                            activity += converted;
                        }
                    }
                }

                if (!mounted) return;

                const formatter = new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency,
                    currencyDisplay: 'narrowSymbol',
                });

                setTotalFormatted(formatter.format(total));
                setBreakdownFormatted({
                    transport: formatter.format(transport),
                    activity: formatter.format(activity),
                    meal: formatter.format(meal),
                });
            } catch {
                if (mounted) {
                    // エラー時は前の値を保持（リセットしない）
                    notifyError('Failed to fetch exchange rates');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        calc();
        return () => {
            mounted = false;
        };
    }, [events, currency]);

    return { loading, totalFormatted, breakdownFormatted } as const;
}
