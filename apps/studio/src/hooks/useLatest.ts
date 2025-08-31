import { useEffect, useRef } from 'react';

/**
 * 最新の値を常に参照するためのHook
 * React 19のuseEventの代替として使用
 * @param value 最新に保持したい値
 * @returns 最新値への参照
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
    const ref = useRef(value) as React.MutableRefObject<T>;
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}
