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
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [value, delay]);

    return debouncedValue;
}
