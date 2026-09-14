import { useEffect, useState } from 'react';

/**
 * Hook that returns a debounced value.
 * @param value The value to debounce.
 * @param delay Delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Without a positive delay there is nothing to debounce: adopt the value during
  // render (React's "storing information from previous renders" pattern) instead of
  // committing a stale value first and correcting it from an effect.
  if (delay <= 0 && !Object.is(debouncedValue, value)) {
    setDebouncedValue(value);
  }

  useEffect(() => {
    if (delay <= 0) return;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}
