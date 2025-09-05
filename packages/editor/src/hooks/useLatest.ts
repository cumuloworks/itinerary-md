import { useEffect, useRef } from 'react';

/**
 * Hook to always reference the latest value.
 * Serves as a substitute for React 19's useEvent.
 * @param value Value to keep up-to-date.
 * @returns A ref to the latest value.
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
    const ref = useRef(value) as React.MutableRefObject<T>;
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}
