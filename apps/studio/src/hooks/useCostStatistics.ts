import type { ItineraryEvent } from '@itinerary-md/core';
import { useMemo } from 'react';
import type { CostBreakdownFormatted } from '../types/itinerary';
import { convertAmountUSDBase, parseAmountWithCurrency } from '../utils/currency';
import { useRatesUSD } from './useRatesUSD';

export function useCostStatistics(events: ItineraryEvent[], currency: string) {
    const { data: ratesData } = useRatesUSD();

    const result = useMemo(() => {
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

            let converted: number;
            if (from === to) {
                converted = parsed.amount;
            } else if (ratesData) {
                const convertedAmount = convertAmountUSDBase(parsed.amount, from, to, ratesData.rates);
                if (convertedAmount == null) continue;
                converted = convertedAmount;
            } else {
                converted = parsed.amount;
            }

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
    }, [events, currency, ratesData]);

    return result;
}
