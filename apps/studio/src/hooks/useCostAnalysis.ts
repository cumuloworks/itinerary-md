import { analyzeCosts } from '@itinerary-md/statistics';
import { useEffect, useState } from 'react';
import { notifyError } from '../core/errors';
import { getRatesUSD } from '../utils/currency';

type CostBreakdownFormatted = {
    transport: string;
    activity: string;
    meal: string;
};

export function useCostAnalysis(content: string, currency: string) {
    const [loading, setLoading] = useState<boolean>(false);
    const [totalFormatted, setTotalFormatted] = useState<string>('—');
    const [breakdownFormatted, setBreakdownFormatted] = useState<CostBreakdownFormatted>({ transport: '—', activity: '—', meal: '—' });

    useEffect(() => {
        let mounted = true;
        const calc = async () => {
            setLoading(true);
            try {
                const { rates } = await getRatesUSD();
                const totals = analyzeCosts(content, currency, rates);
                if (!mounted) return;
                setTotalFormatted(
                    new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency,
                        currencyDisplay: 'narrowSymbol',
                    }).format(totals.total)
                );
                setBreakdownFormatted({
                    transport: new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(totals.transport),
                    activity: new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(totals.activity),
                    meal: new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(totals.meal),
                });
            } catch {
                if (mounted) {
                    setTotalFormatted('—');
                    setBreakdownFormatted({ transport: '—', activity: '—', meal: '—' });
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
    }, [content, currency]);

    return { loading, totalFormatted, breakdownFormatted } as const;
}
