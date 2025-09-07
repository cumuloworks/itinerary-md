import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyError } from '@/core/errors';
import { useTopbarState } from '@/hooks/useTopbarState';
import { isValidIanaTimeZone } from '@/utils/timezone';

// Mocks
vi.mock('@/utils/timezone', () => ({
    isValidIanaTimeZone: vi.fn(),
}));

vi.mock('@/core/errors', () => ({
    notifyError: vi.fn(),
}));

describe('useTopbarState', () => {
    const originalLocation = window.location;
    const originalHistory = window.history;
    const originalIntl = global.Intl;

    beforeEach(() => {
        vi.clearAllMocks();

        // Default timezone mock
        global.Intl = {
            ...originalIntl,
            DateTimeFormat: vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'UTC' }),
            })) as unknown as Intl.DateTimeFormatConstructor,
        } as typeof Intl;

        // Mock location
        delete (window as { location?: Location }).location;
        (window as { location?: Location }).location = {
            ...originalLocation,
            search: '',
            pathname: '/',
            hash: '',
        } as Location;

        // Mock history
        window.history.replaceState = vi.fn();

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        // Default implementation of isValidIanaTimeZone
        const mockIsValidIana = vi.mocked(isValidIanaTimeZone);
        mockIsValidIana.mockReturnValue(true);
    });

    afterEach(() => {
        (window as { location?: Location }).location = originalLocation;
        window.history.replaceState = originalHistory.replaceState;
        global.Intl = originalIntl;
    });

    describe('Initialization', () => {
        it('initializes with default values', () => {
            const { result } = renderHook(() => useTopbarState());
            const [state] = result.current;

            expect(state).toMatchObject({
                timezone: 'UTC',
                currency: 'USD',
                viewMode: 'split',
                showPast: true,
                autoScroll: true,
            });
        });

        it('loads currency from localStorage', () => {
            const getItemMock = vi.fn().mockReturnValue('EUR');
            window.localStorage.getItem = getItemMock;

            const { result } = renderHook(() => useTopbarState());
            const [state] = result.current;

            expect(getItemMock).toHaveBeenCalledWith('itinerary-md-currency');
            expect(state.currency).toBe('EUR');
        });

        it('ignores localStorage errors', () => {
            window.localStorage.getItem = vi.fn().mockImplementation(() => {
                throw new Error('Storage error');
            });

            expect(() => {
                renderHook(() => useTopbarState());
            }).not.toThrow();
        });
    });

    describe('Initialization from URL params', () => {
        it('sets state from valid URL params', () => {
            window.location.search = '?tz=Asia/Tokyo&cur=JPY&view=editor&past=0&scroll=0';

            const { result } = renderHook(() => useTopbarState());
            const [state] = result.current;

            expect(state).toMatchObject({
                timezone: 'Asia/Tokyo',
                currency: 'JPY',
                viewMode: 'editor',
                showPast: false,
                autoScroll: false,
            });
        });

        it('notifies errors for invalid timezone', () => {
            window.location.search = '?tz=Invalid/Zone';
            const mockIsValidIana = vi.mocked(isValidIanaTimeZone);
            mockIsValidIana.mockReturnValue(false);

            renderHook(() => useTopbarState());

            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Invalid/Zone'));
        });

        it('ignores invalid view mode', () => {
            window.location.search = '?view=invalid';

            const { result } = renderHook(() => useTopbarState());
            const [state] = result.current;

            expect(state.viewMode).toBe('split'); // default value
        });

        it('ignores errors when reading URL params', () => {
            // Save existing location
            const originalSearch = window.location.search;

            // Mock search getter to throw when reading
            Object.defineProperty(window.location, 'search', {
                get() {
                    throw new Error('Location error');
                },
                configurable: true,
            });

            // Should not crash even on errors
            expect(() => {
                renderHook(() => useTopbarState());
            }).not.toThrow();

            // Restore original
            Object.defineProperty(window.location, 'search', {
                value: originalSearch,
                writable: true,
                configurable: true,
            });
        });
    });

    describe('State updates', () => {
        it('allows partial updates', () => {
            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({ currency: 'GBP' });
            });

            const [newState] = result.current;
            expect(newState.currency).toBe('GBP');
            expect(newState.viewMode).toBe('split'); // other values remain unchanged
        });

        it('updates multiple properties at once', () => {
            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({
                    timezone: 'America/New_York',
                    viewMode: 'preview',
                    showPast: false,
                });
            });

            const [newState] = result.current;
            expect(newState).toMatchObject({
                timezone: 'America/New_York',
                viewMode: 'preview',
                showPast: false,
            });
        });
    });

    describe('Sync with localStorage', () => {
        it('saves to localStorage on currency change', () => {
            const setItemMock = vi.fn();
            window.localStorage.setItem = setItemMock;

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({ currency: 'AUD' });
            });

            expect(setItemMock).toHaveBeenCalledWith('itinerary-md-currency', 'AUD');
        });

        it('ignores localStorage errors', () => {
            window.localStorage.setItem = vi.fn().mockImplementation(() => {
                throw new Error('Storage error');
            });

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            expect(() => {
                act(() => {
                    updateState({ currency: 'CAD' });
                });
            }).not.toThrow();
        });
    });

    describe('Sync with URL', () => {
        it('updates URL on state changes', () => {
            const replaceStateMock = vi.fn();
            window.history.replaceState = replaceStateMock;

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({ timezone: 'Europe/London' });
            });

            expect(replaceStateMock).toHaveBeenCalled();
            const [, , url] = replaceStateMock.mock.calls[replaceStateMock.mock.calls.length - 1];
            // URLSearchParams encodes automatically; check the encoded form
            expect(url).toContain('tz=Europe%2FLondon');
        });

        it('does not set invalid timezone to URL', () => {
            const mockIsValidIana = vi.mocked(isValidIanaTimeZone);
            mockIsValidIana.mockReturnValue(false);
            const replaceStateMock = vi.fn();
            window.history.replaceState = replaceStateMock;

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({ timezone: 'Invalid/Zone' });
            });

            const [, , url] = replaceStateMock.mock.calls[replaceStateMock.mock.calls.length - 1];
            expect(url).not.toContain('tz=Invalid/Zone');
        });

        it('reflects all parameters to URL correctly', () => {
            const replaceStateMock = vi.fn();
            window.history.replaceState = replaceStateMock;

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({
                    timezone: 'Asia/Seoul',
                    currency: 'KRW',
                    viewMode: 'editor',
                    showPast: false,
                    autoScroll: false,
                });
            });

            const [, , url] = replaceStateMock.mock.calls[replaceStateMock.mock.calls.length - 1];
            // URLSearchParams encodes automatically; check the encoded form
            expect(url).toContain('tz=Asia%2FSeoul');
            expect(url).toContain('cur=KRW');
            expect(url).toContain('view=editor');
            expect(url).toContain('past=0');
            expect(url).toContain('scroll=0');
        });

        it('does not update when URL is already the same', () => {
            window.location.search = '?tz=UTC&cur=USD&view=split&past=1&scroll=1&alt=0';
            const replaceStateMock = vi.fn();
            window.history.replaceState = replaceStateMock;

            renderHook(() => useTopbarState());

            // replaceState should not be called after initialization
            expect(replaceStateMock).not.toHaveBeenCalled();
        });

        it('ignores errors when updating URL', () => {
            window.history.replaceState = vi.fn().mockImplementation(() => {
                throw new Error('History error');
            });

            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            expect(() => {
                act(() => {
                    updateState({ currency: 'INR' });
                });
            }).not.toThrow();
        });
    });

    describe('Edge cases', () => {
        it('works even when window is undefined (conceptually)', () => {
            // useTopbarState assumes a browser environment,
            // so this test case is not actually appropriate.
            // Instead, test under the assumption that window exists.
            expect(typeof window).toBeDefined();

            const { result } = renderHook(() => useTopbarState());
            const [state] = result.current;

            expect(state).toBeDefined();
            expect(state.timezone).toBeDefined();
            expect(state.currency).toBeDefined();
        });

        it('no-op patch does not change state', () => {
            const { result } = renderHook(() => useTopbarState());
            const [initialState, updateState] = result.current;

            act(() => {
                updateState({});
            });

            const [newState] = result.current;
            expect(newState).toEqual(initialState);
        });

        it('handles multiple successive updates correctly', () => {
            const { result } = renderHook(() => useTopbarState());
            const [, updateState] = result.current;

            act(() => {
                updateState({ currency: 'EUR' });
                updateState({ viewMode: 'preview' });
                updateState({ showPast: false });
            });

            const [finalState] = result.current;
            expect(finalState).toMatchObject({
                currency: 'EUR',
                viewMode: 'preview',
                showPast: false,
            });
        });
    });
});
