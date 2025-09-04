import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { useLatest } from '../useLatest';

describe('useLatest', () => {
    describe('基本動作', () => {
        it('初期値を参照として返す', () => {
            const { result } = renderHook(() => useLatest('initial'));
            expect(result.current.current).toBe('initial');
        });

        it('値が更新されても同じ参照を維持する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 'first' } });

            const firstRef = result.current;

            rerender({ value: 'second' });
            const secondRef = result.current;

            expect(firstRef).toBe(secondRef); // 参照は同じ
            expect(result.current.current).toBe('second'); // 値は更新
        });

        it('値の更新を即座に反映する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 1 } });

            expect(result.current.current).toBe(1);

            rerender({ value: 2 });
            expect(result.current.current).toBe(2);

            rerender({ value: 3 });
            expect(result.current.current).toBe(3);
        });
    });

    describe('様々な型での動作', () => {
        it('文字列型を処理する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 'hello' } });

            expect(result.current.current).toBe('hello');

            rerender({ value: 'world' });
            expect(result.current.current).toBe('world');
        });

        it('数値型を処理する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 42 } });

            expect(result.current.current).toBe(42);

            rerender({ value: 100 });
            expect(result.current.current).toBe(100);
        });

        it('真偽値を処理する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: true } });

            expect(result.current.current).toBe(true);

            rerender({ value: false });
            expect(result.current.current).toBe(false);
        });

        it('オブジェクトを処理する', () => {
            const obj1 = { key: 'value1' };
            const obj2 = { key: 'value2' };

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: obj1 } });

            expect(result.current.current).toBe(obj1);

            rerender({ value: obj2 });
            expect(result.current.current).toBe(obj2);
        });

        it('配列を処理する', () => {
            const arr1 = [1, 2, 3];
            const arr2 = [4, 5, 6];

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: arr1 } });

            expect(result.current.current).toBe(arr1);

            rerender({ value: arr2 });
            expect(result.current.current).toBe(arr2);
        });

        it('関数を処理する', () => {
            const fn1 = () => 'first';
            const fn2 = () => 'second';

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: fn1 } });

            expect(result.current.current).toBe(fn1);

            rerender({ value: fn2 });
            expect(result.current.current).toBe(fn2);
        });

        it('null と undefined を処理する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value as string | null | undefined), { initialProps: { value: null as string | null | undefined } });

            expect(result.current.current).toBe(null);

            rerender({ value: null });
            expect(result.current.current).toBe(null);

            rerender({ value: 'value' });
            expect(result.current.current).toBe('value');
        });
    });

    describe('useEventパターンのユースケース', () => {
        it('コールバック内で最新の値にアクセスできる', () => {
            // テスト用のカスタムフックを作成
            function useTestHook() {
                const [count, setCount] = React.useState(0);
                const countRef = useLatest(count);

                const handleClick = () => {
                    // 古いクロージャではなく最新の値を参照
                    return countRef.current;
                };

                return { count, setCount, handleClick, countRef };
            }

            const { result } = renderHook(() => useTestHook());

            // 初期値を確認
            expect(result.current.handleClick()).toBe(0);

            // カウントを更新
            act(() => {
                result.current.setCount(5);
            });

            // ハンドラは最新の値を返す
            expect(result.current.handleClick()).toBe(5);
        });

        it('複数の値を個別に追跡する', () => {
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

    describe('パフォーマンスと安定性', () => {
        it('高頻度の更新でも安定して動作する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 0 } });

            for (let i = 1; i <= 1000; i++) {
                rerender({ value: i });
                expect(result.current.current).toBe(i);
            }
        });

        it('同じ値への更新も正しく処理する', () => {
            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: 'same' } });

            const ref = result.current;

            rerender({ value: 'same' });
            expect(result.current).toBe(ref); // 参照は同じ
            expect(result.current.current).toBe('same'); // 値も同じ
        });

        it('大きなオブジェクトも効率的に処理する', () => {
            const largeObject = {
                data: Array(10000)
                    .fill(0)
                    .map((_, i) => ({
                        id: i,
                        value: `value-${i}`,
                    })),
            };

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: largeObject } });

            expect(result.current.current).toBe(largeObject);

            const newLargeObject = { ...largeObject, updated: true };
            rerender({ value: newLargeObject });
            expect(result.current.current).toBe(newLargeObject);
        });
    });

    describe('エッジケース', () => {
        it('初期値が undefined でも動作する', () => {
            const { result } = renderHook(() => useLatest(undefined));
            expect(result.current.current).toBe(undefined);
        });

        it('循環参照を持つオブジェクトも処理できる', () => {
            const obj: { a: number; self?: unknown } = { a: 1 };
            obj.self = obj; // 循環参照

            const { result } = renderHook(() => useLatest(obj));
            expect(result.current.current).toBe(obj);
            expect(result.current.current.self).toBe(obj);
        });

        it('Symbol 型も処理できる', () => {
            const sym1 = Symbol('test1');
            const sym2 = Symbol('test2');

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: sym1 } });

            expect(result.current.current).toBe(sym1);

            rerender({ value: sym2 });
            expect(result.current.current).toBe(sym2);
        });

        it('Date オブジェクトも処理できる', () => {
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-12-31');

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: date1 } });

            expect(result.current.current).toBe(date1);

            rerender({ value: date2 });
            expect(result.current.current).toBe(date2);
        });

        it('Map と Set も処理できる', () => {
            const map = new Map([['key', 'value']]);
            const set = new Set([1, 2, 3]);

            const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: map as Map<string, string> | Set<number> } });

            expect(result.current.current).toBe(map);

            rerender({ value: set });
            expect(result.current.current).toBe(set);
        });
    });

    describe('TypeScript 型の保持', () => {
        it('ジェネリック型を正しく推論する', () => {
            interface CustomType {
                id: number;
                name: string;
            }

            const value: CustomType = { id: 1, name: 'test' };
            const { result } = renderHook(() => useLatest(value));

            // TypeScript で型が正しく推論されることを確認
            const ref: React.MutableRefObject<CustomType> = result.current;
            expect(ref.current.id).toBe(1);
            expect(ref.current.name).toBe('test');
        });

        it('Union 型も正しく処理する', () => {
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
