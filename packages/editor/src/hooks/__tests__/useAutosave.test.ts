import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { notifyError, safeLocalStorage } from '../../core/errors';
import { useAutosave } from '../useAutosave';

// Mocks
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

    describe('Basic autosave behavior', () => {
        it('saves the value after the specified delay', () => {
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

        it('saves only when the value changes', () => {
            const { rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 500 }), { initialProps: { value: 'initial' } });

            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);

            // Re-render with the same value
            rerender({ value: 'initial' });
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1); // no change

            // Re-render with a different value
            rerender({ value: 'changed' });
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(2);
        });

        it('debounces successive changes', () => {
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

    describe('saveNow function', () => {
        it('executes save immediately', () => {
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

        it('clears pending timer', () => {
            const { result, rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 1000 }), { initialProps: { value: 'initial' } });

            rerender({ value: 'changed' });

            act(() => {
                result.current.saveNow();
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'changed');

            // Should not save again even after the timer advances
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);
        });

        it('skips saving when the value is unchanged', () => {
            const { result } = renderHook(() => useAutosave('same-value', { key: 'test-key', delay: 1000 }));

            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);

            act(() => {
                result.current.saveNow();
            });
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1); // no change
        });
    });

    describe('beforeunload event', () => {
        it('saves before leaving the page', () => {
            renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 5000 }));

            // Dispatch beforeunload event
            act(() => {
                window.dispatchEvent(new Event('beforeunload'));
            });

            // saveNow is called internally and saved to localStorage
            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', 'test-value');
        });

        it('removes event listener on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });
    });

    describe('Error handling', () => {
        it('calls error callback when save fails', () => {
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

        it('uses default error handler', () => {
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

        it('handles errors thrown by onSuccess callback', () => {
            const onSuccess = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            // If the callback throws, the current implementation actually throws
            // because it does not handle errors
            renderHook(() =>
                useAutosave('test-value', {
                    key: 'test-key',
                    delay: 100,
                    onSuccess,
                })
            );

            // Expect an error to be thrown
            expect(() => {
                act(() => {
                    vi.advanceTimersByTime(100);
                });
            }).toThrow('Callback error');

            // onSuccess has been called
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    describe('delay parameter', () => {
        it('treats negative delay as 0', () => {
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

        it('supports dynamic delay changes', () => {
            const { rerender } = renderHook(({ delay }) => useAutosave('test-value', { key: 'test-key', delay }), { initialProps: { delay: 1000 } });

            rerender({ delay: 500 });

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(safeLocalStorage.set).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('clears timer on unmount', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { unmount } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('clears previous timer when value changes', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const { rerender } = renderHook(({ value }) => useAutosave(value, { key: 'test-key', delay: 1000 }), { initialProps: { value: 'first' } });

            rerender({ value: 'second' });
            rerender({ value: 'third' });

            expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('Edge cases', () => {
        it('saves an empty string', () => {
            renderHook(() => useAutosave('', { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', '');
        });

        it('saves a very long string', () => {
            const longString = 'a'.repeat(100000);
            renderHook(() => useAutosave(longString, { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', longString);
        });

        it('saves a string containing special characters', () => {
            const specialString = '{"key": "value"}\n\t\r\\';
            renderHook(() => useAutosave(specialString, { key: 'test-key', delay: 100 }));

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(safeLocalStorage.set).toHaveBeenCalledWith('test-key', specialString);
        });

        it('handles high-frequency saveNow calls', () => {
            const { result } = renderHook(() => useAutosave('test-value', { key: 'test-key', delay: 1000 }));

            act(() => {
                for (let i = 0; i < 100; i++) {
                    result.current.saveNow();
                }
            });

            // Saved only once (same value)
            expect(safeLocalStorage.set).toHaveBeenCalledTimes(1);
        });
    });
});
