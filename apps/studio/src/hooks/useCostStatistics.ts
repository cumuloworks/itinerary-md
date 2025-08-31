import type { ItineraryEvent } from '@itinerary-md/core';
import { useMemo } from 'react';
import type { CostBreakdownFormatted } from '../types/itinerary';
import { convertAmountUSDBase, getRatesUSD, parseAmountWithCurrency } from '../utils/currency';

export function useCostStatistics(events: ItineraryEvent[], currency: string) {
    const result = useMemo(() => {
        const ratesData = getRatesUSD();
        if (!ratesData) {
            return { totalFormatted: null, breakdownFormatted: null };
        }

        const { rates } = ratesData;

        let total = 0;
        let transport = 0;
        let activity = 0;
        let meal = 0;

        for (const { event } of events) {
            const costValue = event.metadata?.cost ?? event.metadata?.price;
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

        const formatter = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            currencyDisplay: 'narrowSymbol',
        });

        return {
            totalFormatted: formatter.format(total),
            breakdownFormatted: {
                transport: formatter.format(transport),
                activity: formatter.format(activity),
                meal: formatter.format(meal),
            } as CostBreakdownFormatted,
        };
    }, [events, currency]);

    return result;
}
