import { useEffect, useState } from 'react';

/**
 * 値をデバウンスして返すHook
 * @param value デバウンス対象の値
 * @param delay 遅延時間（ミリ秒）
 * @returns デバウンスされた値
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
