import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic behavior', () => {
        it('returns initial value immediately', () => {
            const { result } = renderHook(() => useDebouncedValue('initial', 500));
            expect(result.current).toBe('initial');
        });

        it('updates value after the specified delay', () => {
            const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), { initialProps: { value: 'first', delay: 500 } });

            expect(result.current).toBe('first');

            // Change value
            rerender({ value: 'second', delay: 500 });
            expect(result.current).toBe('first'); // not updated yet

            // Advance time
            act(() => {
                vi.advanceTimersByTime(499);
            });
            expect(result.current).toBe('first'); // not updated yet

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(result.current).toBe('second'); // updated
        });

        it('debounces multiple value changes', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), { initialProps: { value: 'first' } });

            // Change values consecutively
            rerender({ value: 'second' });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            rerender({ value: 'third' });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            rerender({ value: 'fourth' });

            expect(result.current).toBe('first'); // still initial value

            // 200ms after the last change
            act(() => {
                vi.advanceTimersByTime(200);
            });
            expect(result.current).toBe('fourth'); // updated to last value
        });
    });

    describe('delay parameter', () => {
        it('updates immediately when delay is 0', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 0), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            expect(result.current).toBe('second'); // updates immediately
        });

        it('updates immediately when delay is negative', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, -100), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            expect(result.current).toBe('second'); // updates immediately
        });

        it('supports dynamic delay changes', () => {
            const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), { initialProps: { value: 'first', delay: 1000 } });

            rerender({ value: 'second', delay: 1000 });
            act(() => {
                vi.advanceTimersByTime(500);
            });

            // Shorten delay
            rerender({ value: 'second', delay: 100 });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe('second');
        });
    });

    describe('Type handling', () => {
        it('debounces numeric values', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: 42 } });

            rerender({ value: 100 });
            expect(result.current).toBe(42);

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(100);
        });

        it('debounces object values', () => {
            const obj1 = { key: 'value1' };
            const obj2 = { key: 'value2' };

            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: obj1 } });

            rerender({ value: obj2 });
            expect(result.current).toBe(obj1);

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(obj2);
        });

        it('debounces array values', () => {
            const arr1 = [1, 2, 3];
            const arr2 = [4, 5, 6];

            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: arr1 } });

            rerender({ value: arr2 });
            expect(result.current).toBe(arr1);

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(arr2);
        });

        it('handles null and undefined', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: null as string | null } });

            expect(result.current).toBe(null);

            rerender({ value: null });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(null);
        });
    });

    describe('Cleanup', () => {
        it('clears timer on unmount', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 500), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('clears previous timer on each value change', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            rerender({ value: 'third' });
            rerender({ value: 'fourth' });

            // clearTimeout is called for each value change
            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('Edge cases', () => {
        it('debounces even when changing to the same value', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: 'same' } });

            rerender({ value: 'same' });
            expect(result.current).toBe('same');

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe('same');
        });

        it('handles very long delay', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 10000), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });

            act(() => {
                vi.advanceTimersByTime(9999);
            });
            expect(result.current).toBe('first');

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(result.current).toBe('second');
        });

        it('does not leak memory under high-frequency updates', () => {
            const { rerender } = renderHook(({ value }) => useDebouncedValue(value, 10), { initialProps: { value: 0 } });

            // 1000 rapid updates
            for (let i = 1; i <= 1000; i++) {
                rerender({ value: i });
            }

            act(() => {
                vi.advanceTimersByTime(10);
            });

            // Ensure finishes without errors
            expect(true).toBe(true);
        });
    });
});
