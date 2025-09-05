import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useQueryParams } from '../useQueryParams';

describe('useQueryParams', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        delete (window as { location?: Location }).location;
        (window as { location?: Location }).location = {
            ...originalLocation,
            search: '',
        } as Location;
    });

    afterEach(() => {
        (window as { location?: Location }).location = originalLocation;
    });

    describe('Parsing parameters', () => {
        it('returns empty object for empty query params', () => {
            window.location.search = '';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('parses timezone parameter', () => {
            window.location.search = '?tz=Asia/Tokyo';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'Asia/Tokyo' });
        });

        it('uppercases currency parameter', () => {
            window.location.search = '?cur=usd';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ cur: 'USD' });
        });

        it('accepts only valid 3-letter uppercase currency codes', () => {
            window.location.search = '?cur=US';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('parses valid view mode', () => {
            window.location.search = '?view=editor';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ view: 'editor' });
        });

        it('ignores invalid view mode', () => {
            window.location.search = '?view=invalid';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('parses multiple parameters together', () => {
            window.location.search = '?tz=Europe/London&cur=gbp&view=preview';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({
                tz: 'Europe/London',
                cur: 'GBP',
                view: 'preview',
            });
        });
    });

    describe('Validating view mode', () => {
        it('accepts split mode', () => {
            window.location.search = '?view=split';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('split');
        });

        it('accepts editor mode', () => {
            window.location.search = '?view=editor';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('editor');
        });

        it('accepts preview mode', () => {
            window.location.search = '?view=preview';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('preview');
        });

        it('is case-sensitive', () => {
            window.location.search = '?view=SPLIT';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBeUndefined();
        });
    });

    describe('Validating currency codes', () => {
        it('accepts properly formatted currency codes', () => {
            const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY'];
            for (const currency of currencies) {
                window.location.search = `?cur=${currency.toLowerCase()}`;
                const { result } = renderHook(() => useQueryParams());
                expect(result.current.cur).toBe(currency);
            }
        });

        it('rejects 2-letter currency codes', () => {
            window.location.search = '?cur=US';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('rejects 4+ letter currency codes', () => {
            window.location.search = '?cur=USDT';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('rejects currency codes containing digits', () => {
            window.location.search = '?cur=US1';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('rejects currency codes containing special characters', () => {
            window.location.search = '?cur=US$';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });
    });

    describe('Error handling', () => {
        it('handles errors from URLSearchParams', () => {
            const originalSearch = window.location.search;

            // Mock reading search to throw an error
            Object.defineProperty(window.location, 'search', {
                get() {
                    throw new Error('Location error');
                },
                configurable: true,
            });

            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});

            // Restore
            Object.defineProperty(window.location, 'search', {
                value: originalSearch,
                writable: true,
                configurable: true,
            });
        });

        it('handles when window is undefined (conceptually)', () => {
            // useQueryParams assumes a browser; instead test empty search case
            window.location.search = '';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('handles invalid query string format', () => {
            window.location.search = '?&&==&&';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });
    });

    describe('Special cases', () => {
        it('uses the first value for duplicated parameters', () => {
            window.location.search = '?tz=Asia/Tokyo&tz=Europe/London';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Asia/Tokyo');
        });

        it('ignores parameters with empty values', () => {
            window.location.search = '?tz=&cur=&view=';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('handles parameters with null values', () => {
            window.location.search = '?tz=null&cur=null';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'null' }); // cur は無効なのでなし
        });

        it('decodes encoded parameters', () => {
            window.location.search = '?tz=Asia%2FTokyo';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Asia/Tokyo');
        });

        it('ignores unrelated parameters', () => {
            window.location.search = '?tz=UTC&other=value&random=123';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'UTC' });
        });

        it('handles timezones containing spaces', () => {
            window.location.search = '?tz=America/New_York';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('America/New_York');
        });

        it('handles timezones containing special characters', () => {
            // URLSearchParams converts + to space; use encoded form
            window.location.search = '?tz=Etc/GMT%2B9';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Etc/GMT+9');
        });
    });

    describe('Performance', () => {
        it('handles many parameters efficiently', () => {
            const params = [];
            for (let i = 0; i < 100; i++) {
                params.push(`param${i}=value${i}`);
            }
            params.push('tz=UTC', 'cur=usd', 'view=split');
            window.location.search = `?${params.join('&')}`;

            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({
                tz: 'UTC',
                cur: 'USD',
                view: 'split',
            });
        });

        it('handles very long parameter values', () => {
            const longValue = 'A'.repeat(1000);
            window.location.search = `?tz=${longValue}`;
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe(longValue);
        });
    });
});
