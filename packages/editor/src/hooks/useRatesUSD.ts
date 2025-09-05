import { useEffect, useState } from 'react';
import type { RatesUSDBase } from '../utils/currency';
import { getRatesUSD, initializeRates } from '../utils/currency';

interface UseRatesUSDResult {
    data: RatesUSDBase | null;
    ready: boolean;
}

/**
 * Hook to manage currency rates and readiness state.
 * Triggers re-render when rates become available.
 */
export function useRatesUSD(): UseRatesUSDResult {
    const [ratesState, setRatesState] = useState<UseRatesUSDResult>(() => {
        const initialRates = getRatesUSD();
        return {
            data: initialRates,
            ready: initialRates !== null,
        };
    });

    useEffect(() => {
        if (!ratesState.ready) {
            const checkRates = () => {
                const currentRates = getRatesUSD();
                if (currentRates) {
                    setRatesState({
                        data: currentRates,
                        ready: true,
                    });
                    return true;
                }
                return false;
            };

            if (checkRates()) {
                return;
            }

            const interval = setInterval(() => {
                if (checkRates()) {
                    clearInterval(interval);
                }
            }, 100);
            initializeRates().catch(() => {});

            return () => clearInterval(interval);
        }
    }, [ratesState.ready]);

    return ratesState;
}
