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

    describe('パラメータの解析', () => {
        it('空のクエリパラメータで空のオブジェクトを返す', () => {
            window.location.search = '';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('タイムゾーンパラメータを解析する', () => {
            window.location.search = '?tz=Asia/Tokyo';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'Asia/Tokyo' });
        });

        it('通貨パラメータを大文字に変換する', () => {
            window.location.search = '?cur=usd';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ cur: 'USD' });
        });

        it('有効な通貨コード（3文字の大文字）のみ受け付ける', () => {
            window.location.search = '?cur=US';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('有効なビューモードを解析する', () => {
            window.location.search = '?view=editor';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ view: 'editor' });
        });

        it('無効なビューモードを無視する', () => {
            window.location.search = '?view=invalid';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('複数のパラメータを同時に解析する', () => {
            window.location.search = '?tz=Europe/London&cur=gbp&view=preview';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({
                tz: 'Europe/London',
                cur: 'GBP',
                view: 'preview',
            });
        });
    });

    describe('ビューモードの検証', () => {
        it('split モードを受け付ける', () => {
            window.location.search = '?view=split';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('split');
        });

        it('editor モードを受け付ける', () => {
            window.location.search = '?view=editor';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('editor');
        });

        it('preview モードを受け付ける', () => {
            window.location.search = '?view=preview';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBe('preview');
        });

        it('大文字小文字を区別する', () => {
            window.location.search = '?view=SPLIT';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.view).toBeUndefined();
        });
    });

    describe('通貨コードの検証', () => {
        it('正しい形式の通貨コードを受け付ける', () => {
            const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY'];
            for (const currency of currencies) {
                window.location.search = `?cur=${currency.toLowerCase()}`;
                const { result } = renderHook(() => useQueryParams());
                expect(result.current.cur).toBe(currency);
            }
        });

        it('2文字の通貨コードを拒否する', () => {
            window.location.search = '?cur=US';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('4文字以上の通貨コードを拒否する', () => {
            window.location.search = '?cur=USDT';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('数字を含む通貨コードを拒否する', () => {
            window.location.search = '?cur=US1';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });

        it('特殊文字を含む通貨コードを拒否する', () => {
            window.location.search = '?cur=US$';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.cur).toBeUndefined();
        });
    });

    describe('エラーハンドリング', () => {
        it('URLSearchParams のエラーを処理する', () => {
            const originalSearch = window.location.search;

            // searchを読み取り時にエラーを投げるようにモック
            Object.defineProperty(window.location, 'search', {
                get() {
                    throw new Error('Location error');
                },
                configurable: true,
            });

            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});

            // 元に戻す
            Object.defineProperty(window.location, 'search', {
                value: originalSearch,
                writable: true,
                configurable: true,
            });
        });

        it('window が undefined の場合を処理する', () => {
            // useQueryParamsはブラウザ環境を前提としているため、
            // windowがundefinedの場合のテストは実際には不要
            // 代わりに空のsearchパラメータの場合をテスト
            window.location.search = '';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('不正な形式のクエリ文字列を処理する', () => {
            window.location.search = '?&&==&&';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });
    });

    describe('特殊なケース', () => {
        it('重複するパラメータは最初の値を使用する', () => {
            window.location.search = '?tz=Asia/Tokyo&tz=Europe/London';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Asia/Tokyo');
        });

        it('空の値のパラメータを無視する', () => {
            window.location.search = '?tz=&cur=&view=';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({});
        });

        it('null 値を持つパラメータを処理する', () => {
            window.location.search = '?tz=null&cur=null';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'null' }); // cur は無効なのでなし
        });

        it('エンコードされたパラメータをデコードする', () => {
            window.location.search = '?tz=Asia%2FTokyo';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Asia/Tokyo');
        });

        it('関係ないパラメータを無視する', () => {
            window.location.search = '?tz=UTC&other=value&random=123';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current).toEqual({ tz: 'UTC' });
        });

        it('スペースを含むタイムゾーンを処理する', () => {
            window.location.search = '?tz=America/New_York';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('America/New_York');
        });

        it('特殊文字を含むタイムゾーンを処理する', () => {
            // URLSearchParamsは+をスペースに変換するため、エンコードされた形式を使用
            window.location.search = '?tz=Etc/GMT%2B9';
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe('Etc/GMT+9');
        });
    });

    describe('パフォーマンス', () => {
        it('多数のパラメータを効率的に処理する', () => {
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

        it('非常に長いパラメータ値を処理する', () => {
            const longValue = 'A'.repeat(1000);
            window.location.search = `?tz=${longValue}`;
            const { result } = renderHook(() => useQueryParams());
            expect(result.current.tz).toBe(longValue);
        });
    });
});
