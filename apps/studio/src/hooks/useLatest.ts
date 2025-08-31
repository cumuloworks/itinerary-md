import { useRef } from 'react';

/**
 * 最新の値を常に参照するためのHook
 * React 19のuseEventの代替として使用
 * @param value 最新に保持したい値
 * @returns 最新値への参照
 */
export function useLatest<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}
