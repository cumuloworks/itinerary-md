import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { notifyError, safeLocalStorage } from '../../core/errors';
import { useAutosave } from '../useAutosave';

// モック
vi.mock('../../core/errors', () => ({
    notifyError: vi.fn(),
    safeLocalStorage: {
        set: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
    },
}));

describe('useAutosave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        (safeLocalStorage.set as Mock).mockReturnValue(true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('自動保存の基本動作', () => {
        it('指定時間後に値を保存する', () => {
            const onSuccess = vi.fn();
            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 1000,
                    onSuccess,
                })
            );

            expect(safeLocalStorage.set).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'test-value');
            expect(onSuccess).toHaveBeenCalled();
        });

        it('値が変更されたときのみ保存する', () => {
            const { rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 500 }), { initialProps: { value: 'initial' } });

            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);

            // 同じ値で再レンダリング
            rerender({ value: 'initial' });
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1); // 変化なし

            // 異なる値で再レンダリング
            rerender({ value: 'changed' });
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(2);
        });

        it('連続した変更をデバウンスする', () => {
            const { rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 500 }), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            act(() => {
                vi.advanceTimersByTime(200);
            });
            rerender({ value: 'third' });
            act(() => {
                vi.advanceTimersByTime(200);
            });
            rerender({ value: 'fourth' });

            expect(safeLocalStorage.set).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);
            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'fourth');
        });
    });

    describe('saveNow 関数', () => {
        it('即座に保存を実行する', () => {
            const onSuccess = vi.fn();
            const { result } = renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 5000,
                    onSuccess,
                })
            );

            expect(safeLocalStorage.set).not.toHaveBeenCalled();

            act(() => {
                result.current.saveNow();
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'test-value');
            expect(onSuccess).toHaveBeenCalled();
        });

        it('ペンディング中のタイマーをクリアする', () => {
            const { result, rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 1000 }), { initialProps: { value: 'initial' } });

            rerender({ value: 'changed' });

            act(() => {
                result.current.saveNow();
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'changed');

            // タイマーが進んでも再度保存されない
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);
        });

        it('同じ値の場合は保存をスキップする', () => {
            const { result } = renderHook(() => useAutosave('same-value', { key: 'test-key', delay: 1000 }));

            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);

            act(() => {
                result.current.saveNow();
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1); // 変化なし
        });
    });

    describe('beforeunload イベント', () => {
        it('ページ離脱前に保存を実行する', () => {
            renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 5000 }));

            // beforeunloadイベントをディスパッチ
            act(() => {
                window.dispatchEvent(new Event('beforeunload'));
            });

            // saveNowが内部的に呼ばれてlocalStorageに保存される
            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'test-value');
        });

        it('アンマウント時にイベントリスナーを削除する', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });
    });

    describe('エラーハンドリング', () => {
        it('保存失敗時にエラーコールバックを呼ぶ', () => {
            (safeLocalStorage.set as Mock).mockReturnValue(false);
            const onError = vi.fn();

            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 100,
                    onError,
                })
            );

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(onError).toHaveBeenCalled();
        });

        it('デフォルトのエラーハンドラーを使用する', () => {
            (safeLocalStorage.set as Mock).mockReturnValue(false);

            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 100,
                })
            );

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(notifyError).toHaveBeenCalledWith('Failed to save');
        });

        it('保存成功後のコールバックエラーを処理する', () => {
            const onSuccess = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            // コールバックがエラーを投げる場合、現在の実装では実際にエラーが発生する
            // これは実装がエラーハンドリングを行っていないためです
            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 100,
                    onSuccess,
                })
            );

            // エラーが投げられることを期待
            expect(() => {
                act(() => {
                    vi.advanceTimersByTime(100);
                });
            }).toThrow('Callback error');

            // onSuccessは呼ばれている
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    describe('delay パラメータ', () => {
        it('負の delay を 0 として扱う', () => {
            const onSuccess = vi.fn();
            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: -100,
                    onSuccess,
                })
            );

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(safeLocalStorage.set).toHaveBeenCalled();
            expect(onSuccess).toHaveBeenCalled();
        });

        it('delay を動的に変更できる', () => {
            const { rerender } = renderHook(({ delay }) => useAutosave('test-value', { key: 'test-key', delay }), { initialProps: { delay: 1000 } });

            rerender({ delay: 500 });

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(safeLocalStorage.set).toHaveBeenCalled();
        });
    });

    describe('クリーンアップ', () => {
        it('アンマウント時にタイマーをクリアする', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { unmount } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('値変更時に前のタイマーをクリアする', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 1000 }), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            rerender({ value: 'third' });

            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('エッジケース', () => {
        it('空文字列を保存できる', () => {
            renderHook(() => useAutosave('', { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', '');
        });

        it('非常に長い文字列を保存できる', () => {
            const longString = 'a'.repeat(100000);
            renderHook(() => useAutosave(longString, { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', longString);
        });

        it('特殊文字を含む文字列を保存できる', () => {
            const specialString = '{"key": "value"}\n\t\r\\';
            renderHook(() => useAutosave(specialString, { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', specialString);
        });

        it('高頻度の saveNow 呼び出しを処理できる', () => {
            const { result } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            act(() => {
                for (let i = 0; i < 100; i++) {
                    result.current.saveNow();
                }
            });

            // 1回だけ保存される（同じ値なので）
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);
        });
    });
});
