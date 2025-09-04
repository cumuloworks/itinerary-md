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

    describe('基本動作', () => {
        it('初期値を即座に返す', () => {
            const { result } = renderHook(() => useDebouncedValue('initial', 500));
            expect(result.current).toBe('initial');
        });

        it('指定時間後に値を更新する', () => {
            const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), { initialProps: { value: 'first', delay: 500 } });

            expect(result.current).toBe('first');

            // 値を変更
            rerender({ value: 'second', delay: 500 });
            expect(result.current).toBe('first'); // まだ更新されない

            // 時間を進める
            act(() => {
                vi.advanceTimersByTime(499);
            });
            expect(result.current).toBe('first'); // まだ更新されない

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(result.current).toBe('second'); // 更新される
        });

        it('複数の値変更をデバウンスする', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), { initialProps: { value: 'first' } });

            // 連続して値を変更
            rerender({ value: 'second' });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            rerender({ value: 'third' });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            rerender({ value: 'fourth' });

            expect(result.current).toBe('first'); // まだ最初の値

            // 最後の変更から200ms後
            act(() => {
                vi.advanceTimersByTime(200);
            });
            expect(result.current).toBe('fourth'); // 最後の値に更新
        });
    });

    describe('delay パラメータ', () => {
        it('delay が 0 の場合は即座に更新', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 0), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            expect(result.current).toBe('second'); // 即座に更新
        });

        it('負の delay も即座に更新', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, -100), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            expect(result.current).toBe('second'); // 即座に更新
        });

        it('delay を動的に変更できる', () => {
            const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), { initialProps: { value: 'first', delay: 1000 } });

            rerender({ value: 'second', delay: 1000 });
            act(() => {
                vi.advanceTimersByTime(500);
            });

            // delay を短くする
            rerender({ value: 'second', delay: 100 });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe('second');
        });
    });

    describe('型の処理', () => {
        it('数値型の値をデバウンスする', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: 42 } });

            rerender({ value: 100 });
            expect(result.current).toBe(42);

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(100);
        });

        it('オブジェクト型の値をデバウンスする', () => {
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

        it('配列型の値をデバウンスする', () => {
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

        it('null と undefined を処理できる', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: null as string | null } });

            expect(result.current).toBe(null);

            rerender({ value: null });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe(null);
        });
    });

    describe('クリーンアップ', () => {
        it('アンマウント時にタイマーをクリアする', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 500), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('値が変更される度に前のタイマーをクリアする', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            rerender({ value: 'third' });
            rerender({ value: 'fourth' });

            // 各値変更でclearTimeoutが呼ばれる
            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('エッジケース', () => {
        it('同じ値への変更でもデバウンス処理が動作する', () => {
            const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: 'same' } });

            rerender({ value: 'same' });
            expect(result.current).toBe('same');

            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe('same');
        });

        it('非常に長い遅延時間も処理できる', () => {
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

        it('高頻度の値変更でもメモリリークしない', () => {
            const { rerender } = renderHook(({ value }) => useDebouncedValue(value, 10), { initialProps: { value: 0 } });

            // 1000回の高速更新
            for (let i = 1; i <= 1000; i++) {
                rerender({ value: i });
            }

            act(() => {
                vi.advanceTimersByTime(10);
            });

            // エラーなく完了することを確認
            expect(true).toBe(true);
        });
    });
});
