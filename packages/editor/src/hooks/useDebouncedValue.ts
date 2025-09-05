import { useEffect, useState } from 'react';

/**
 * Hook that returns a debounced value.
 * @param value The value to debounce.
 * @param delay Delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        if (delay <= 0) {
            setDebouncedValue(value);
            return;
        }
        const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(timeoutId);
    }, [value, delay]);

    return debouncedValue;
}
