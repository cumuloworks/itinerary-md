import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { useLatest } from '@/hooks/useLatest';

describe('useLatest', () => {
    describe('Basic behavior', () => {
        it('returns the initial value by reference', () => {
            const { result } = renderHook(() => useLatest('initial'));
            expect(result.current.current).toBe('initial');
        });

        it('keeps the same reference even when value updates', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 'first' },
            });

            const firstRef = result.current;

            rerender({ value: 'second' });
            const secondRef = result.current;

            expect(firstRef).toBe(secondRef); // same reference
            expect(result.current.current).toBe('second'); // value updated
        });

        it('reflects value updates immediately', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 1 },
            });

            expect(result.current.current).toBe(1);

            rerender({ value: 2 });
            expect(result.current.current).toBe(2);

            rerender({ value: 3 });
            expect(result.current.current).toBe(3);
        });
    });

    describe('Behavior with various types', () => {
        it('handles strings', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 'hello' },
            });

            expect(result.current.current).toBe('hello');

            rerender({ value: 'world' });
            expect(result.current.current).toBe('world');
        });

        it('handles numbers', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 42 },
            });

            expect(result.current.current).toBe(42);

            rerender({ value: 100 });
            expect(result.current.current).toBe(100);
        });

        it('handles booleans', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: true },
            });

            expect(result.current.current).toBe(true);

            rerender({ value: false });
            expect(result.current.current).toBe(false);
        });

        it('handles objects', () => {
            const obj1 = { key: 'value1' };
            const obj2 = { key: 'value2' };

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: obj1 },
            });

            expect(result.current.current).toBe(obj1);

            rerender({ value: obj2 });
            expect(result.current.current).toBe(obj2);
        });

        it('handles arrays', () => {
            const arr1 = [1, 2, 3];
            const arr2 = [4, 5, 6];

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: arr1 },
            });

            expect(result.current.current).toBe(arr1);

            rerender({ value: arr2 });
            expect(result.current.current).toBe(arr2);
        });

        it('handles functions', () => {
            const fn1 = () => 'first';
            const fn2 = () => 'second';

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: fn1 },
            });

            expect(result.current.current).toBe(fn1);

            rerender({ value: fn2 });
            expect(result.current.current).toBe(fn2);
        });

        it('handles null and undefined', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value as string | null | undefined), { initialProps: { value: null as string | null | undefined } });

            expect(result.current.current).toBe(null);

            rerender({ value: null });
            expect(result.current.current).toBe(null);

            rerender({ value: 'value' });
            expect(result.current.current).toBe('value');
        });
    });

    describe('Use cases with useEvent pattern', () => {
        it('accesses the latest value inside a callback', () => {
            // Create a custom hook for the test
            function useTestHook() {
                const [count, setCount] = React.useState(0);
                const countRef = useLatest(count);

                const handleClick = () => {
                    // Refer to the latest value, not a stale closure
                    return countRef.current;
                };

                return { count, setCount, handleClick, countRef };
            }

            const { result } = renderHook(() => useTestHook());

            // Check initial value
            expect(result.current.handleClick()).toBe(0);

            // Update count
            act(() => {
                result.current.setCount(5);
            });

            // Handler returns the latest value
            expect(result.current.handleClick()).toBe(5);
        });

        it('tracks multiple values individually', () => {
            const { result, rerender } = renderHook(
                ({ value1, value2 }) => ({
                    ref1: useLatest(value1),
                    ref2: useLatest(value2),
                }),
                { initialProps: { value1: 'A', value2: 'B' } }
            );

            expect(result.current.ref1.current).toBe('A');
            expect(result.current.ref2.current).toBe('B');

            rerender({ value1: 'C', value2: 'B' });
            expect(result.current.ref1.current).toBe('C');
            expect(result.current.ref2.current).toBe('B');

            rerender({ value1: 'C', value2: 'D' });
            expect(result.current.ref1.current).toBe('C');
            expect(result.current.ref2.current).toBe('D');
        });
    });

    describe('Performance and stability', () => {
        it('works stably even with high-frequency updates', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 0 },
            });

            for (let i = 1; i <= 1000; i++) {
                rerender({ value: i });
                expect(result.current.current).toBe(i);
            }
        });

        it('handles updates to the same value correctly', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: 'same' },
            });

            const ref = result.current;

            rerender({ value: 'same' });
            expect(result.current).toBe(ref); // same reference
            expect(result.current.current).toBe('same'); // same value
        });

        it('handles large objects efficiently', () => {
            const largeObject = {
                data: Array(10000)
                    .fill(0)
                    .map((_, i) => ({
                        id: i,
                        value: `value-${i}`,
                    })),
            };

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: largeObject },
            });

            expect(result.current.current).toBe(largeObject);

            const newLargeObject = { ...largeObject, updated: true };
            rerender({ value: newLargeObject });
            expect(result.current.current).toBe(newLargeObject);
        });
    });

    describe('Edge cases', () => {
        it('works when initial value is undefined', () => {
            const { result } = renderHook(() => useLatest(undefined));
            expect(result.current.current).toBe(undefined);
        });

        it('handles objects with circular references', () => {
            const obj: { a: number; self?: unknown } = { a: 1 };
            obj.self = obj; // circular reference

            const { result } = renderHook(() => useLatest(obj));
            expect(result.current.current).toBe(obj);
            expect(result.current.current.self).toBe(obj);
        });

        it('handles Symbol type', () => {
            const sym1 = Symbol('test1');
            const sym2 = Symbol('test2');

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: sym1 },
            });

            expect(result.current.current).toBe(sym1);

            rerender({ value: sym2 });
            expect(result.current.current).toBe(sym2);
        });

        it('handles Date objects', () => {
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-12-31');

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: date1 },
            });

            expect(result.current.current).toBe(date1);

            rerender({ value: date2 });
            expect(result.current.current).toBe(date2);
        });

        it('handles Map and Set', () => {
            const map = new Map([['key', 'value']]);
            const set = new Set([1, 2, 3]);

            const { result, rerender } = renderHook(({ value }) => useLatest(value), {
                initialProps: { value: map as Map<string, string> | Set<number> },
            });

            expect(result.current.current).toBe(map);

            rerender({ value: set });
            expect(result.current.current).toBe(set);
        });
    });

    describe('TypeScript typing preservation', () => {
        it('infers generics correctly', () => {
            interface CustomType {
                id: number;
                name: string;
            }

            const value: CustomType = { id: 1, name: 'test' };
            const { result } = renderHook(() => useLatest(value));

            // Ensure TypeScript infers types correctly
            const ref: React.MutableRefObject<CustomType> = result.current;
            expect(ref.current.id).toBe(1);
            expect(ref.current.name).toBe('test');
        });

        it('handles union types correctly', () => {
            type UnionType = string | number | boolean;

            const { result, rerender } = renderHook(({ value }) => useLatest<UnionType>(value), { initialProps: { value: 'string' as UnionType } });

            expect(result.current.current).toBe('string');

            rerender({ value: 42 });
            expect(result.current.current).toBe(42);

            rerender({ value: true });
            expect(result.current.current).toBe(true);
        });
    });
});
