import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { COMMON_CURRENCIES, convertAmountUSDBase, fetchRatesUSD, formatCurrency, getCachedRatesUSD, getRatesUSD, initializeRates, parseAmountWithCurrency, setCachedRatesUSD } from '../currency';

describe('currency utilities', () => {
    const originalFetch = global.fetch;
    const originalDateNow = Date.now;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn() as Mock;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        Date.now = originalDateNow;
    });

    describe('parseAmountWithCurrency', () => {
        it('通貨コードが末尾にある形式を解析', () => {
            expect(parseAmountWithCurrency('100 USD')).toEqual({
                amount: 100,
                currency: 'USD',
                raw: '100 USD',
            });
            expect(parseAmountWithCurrency('1,234.56 EUR')).toEqual({
                amount: 1234.56,
                currency: 'EUR',
                raw: '1,234.56 EUR',
            });
        });

        it('通貨コードが先頭にある形式を解析', () => {
            expect(parseAmountWithCurrency('USD 100')).toEqual({
                amount: 100,
                currency: 'USD',
                raw: 'USD 100',
            });
            expect(parseAmountWithCurrency('JPY 50000')).toEqual({
                amount: 50000,
                currency: 'JPY',
                raw: 'JPY 50000',
            });
        });

        it('通貨記号を含む形式を解析', () => {
            expect(parseAmountWithCurrency('$100')).toEqual({
                amount: 100,
                currency: 'USD',
                raw: '$100',
            });
            expect(parseAmountWithCurrency('€50')).toEqual({
                amount: 50,
                currency: 'EUR',
                raw: '€50',
            });
            expect(parseAmountWithCurrency('¥1000')).toEqual({
                amount: 1000,
                currency: 'JPY',
                raw: '¥1000',
            });
            expect(parseAmountWithCurrency('£25.50')).toEqual({
                amount: 25.5,
                currency: 'GBP',
                raw: '£25.50',
            });
        });

        it('特殊な通貨記号を解析', () => {
            expect(parseAmountWithCurrency('A$100')).toEqual({
                amount: 100,
                currency: 'AUD',
                raw: 'A$100',
            });
            expect(parseAmountWithCurrency('C$50')).toEqual({
                amount: 50,
                currency: 'CAD',
                raw: 'C$50',
            });
            expect(parseAmountWithCurrency('HK$200')).toEqual({
                amount: 200,
                currency: 'HKD',
                raw: 'HK$200',
            });
        });

        it('カンマ区切りの数値を処理', () => {
            expect(parseAmountWithCurrency('1,000 USD')).toEqual({
                amount: 1000,
                currency: 'USD',
                raw: '1,000 USD',
            });
            expect(parseAmountWithCurrency('10,000,000 JPY')).toEqual({
                amount: 10000000,
                currency: 'JPY',
                raw: '10,000,000 JPY',
            });
        });

        it('小数点を含む数値を処理', () => {
            expect(parseAmountWithCurrency('99.99 EUR')).toEqual({
                amount: 99.99,
                currency: 'EUR',
                raw: '99.99 EUR',
            });
            expect(parseAmountWithCurrency('0.50 USD')).toEqual({
                amount: 0.5,
                currency: 'USD',
                raw: '0.50 USD',
            });
        });

        it('負の値を処理', () => {
            expect(parseAmountWithCurrency('-100 USD')).toEqual({
                amount: -100,
                currency: 'USD',
                raw: '-100 USD',
            });
            // 通貨記号の前にマイナスがある場合は現在の実装では対応していない
            // 代わりに€-50のような形式をテスト
            expect(parseAmountWithCurrency('€-50')).toEqual({
                amount: -50,
                currency: 'EUR',
                raw: '€-50',
            });
        });

        it('修飾子付きの値を処理（/night, per personなど）', () => {
            expect(parseAmountWithCurrency('100 USD/night')).toEqual({
                amount: 100,
                currency: 'USD',
                raw: '100 USD/night',
            });
            expect(parseAmountWithCurrency('EUR 320/night')).toEqual({
                amount: 320,
                currency: 'EUR',
                raw: 'EUR 320/night',
            });
        });

        it('通貨コードなしでフォールバックを使用', () => {
            expect(parseAmountWithCurrency('100', 'JPY')).toEqual({
                amount: 100,
                currency: 'JPY',
                raw: '100',
            });
            expect(parseAmountWithCurrency('50.5', 'EUR')).toEqual({
                amount: 50.5,
                currency: 'EUR',
                raw: '50.5',
            });
        });

        it('空文字列やnullを処理', () => {
            expect(parseAmountWithCurrency('')).toEqual({
                amount: null,
                currency: undefined,
                raw: '',
            });
            expect(parseAmountWithCurrency('   ')).toEqual({
                amount: null,
                currency: undefined,
                raw: '   ',
            });
        });

        it('数値として解析できない文字列を処理', () => {
            expect(parseAmountWithCurrency('abc')).toEqual({
                amount: null,
                currency: undefined,
                raw: 'abc',
            });
            expect(parseAmountWithCurrency('N/A', 'USD')).toEqual({
                amount: null,
                currency: 'USD',
                raw: 'N/A',
            });
        });

        it('大文字小文字を区別しない', () => {
            expect(parseAmountWithCurrency('100 usd')).toEqual({
                amount: 100,
                currency: 'USD',
                raw: '100 usd',
            });
            expect(parseAmountWithCurrency('eur 50')).toEqual({
                amount: 50,
                currency: 'EUR',
                raw: 'eur 50',
            });
        });
    });

    describe('convertAmountUSDBase', () => {
        const mockRates = {
            USD: 1,
            EUR: 0.85,
            JPY: 110,
            GBP: 0.73,
        };

        it('USDから他の通貨への変換', () => {
            expect(convertAmountUSDBase(100, 'USD', 'EUR', mockRates)).toBeCloseTo(85);
            expect(convertAmountUSDBase(100, 'USD', 'JPY', mockRates)).toBeCloseTo(11000);
        });

        it('他の通貨からUSDへの変換', () => {
            expect(convertAmountUSDBase(85, 'EUR', 'USD', mockRates)).toBeCloseTo(100);
            expect(convertAmountUSDBase(11000, 'JPY', 'USD', mockRates)).toBeCloseTo(100);
        });

        it('USD以外の通貨間の変換', () => {
            const eurToJpy = convertAmountUSDBase(100, 'EUR', 'JPY', mockRates);
            expect(eurToJpy).toBeCloseTo(12941.18, 1);
        });

        it('同じ通貨への変換は金額をそのまま返す', () => {
            expect(convertAmountUSDBase(100, 'USD', 'USD', mockRates)).toBe(100);
            expect(convertAmountUSDBase(50, 'EUR', 'EUR', mockRates)).toBe(50);
        });

        it('レートが存在しない通貨はnullを返す', () => {
            expect(convertAmountUSDBase(100, 'USD', 'XXX', mockRates)).toBeNull();
            expect(convertAmountUSDBase(100, 'XXX', 'USD', mockRates)).toBeNull();
        });

        it('無効な入力でnullを返す', () => {
            expect(convertAmountUSDBase(NaN, 'USD', 'EUR', mockRates)).toBeNull();
            expect(convertAmountUSDBase(Infinity, 'USD', 'EUR', mockRates)).toBeNull();
            expect(convertAmountUSDBase(100, '', 'EUR', mockRates)).toBeNull();
            expect(convertAmountUSDBase(100, 'USD', '', mockRates)).toBeNull();
        });

        it('ゼロの金額を変換', () => {
            expect(convertAmountUSDBase(0, 'USD', 'EUR', mockRates)).toBe(0);
        });

        it('負の金額を変換', () => {
            expect(convertAmountUSDBase(-100, 'USD', 'EUR', mockRates)).toBeCloseTo(-85);
        });
    });

    describe('formatCurrency', () => {
        it('通貨コードで金額をフォーマット', () => {
            const formatted = formatCurrency(1234.56, 'USD');
            expect(formatted).toContain('1,234');
            expect(formatted).toMatch(/\$|USD/);
        });

        it('様々な通貨でフォーマット', () => {
            expect(formatCurrency(100, 'EUR')).toMatch(/€|EUR/);
            expect(formatCurrency(10000, 'JPY')).toMatch(/¥|JPY/);
            expect(formatCurrency(50, 'GBP')).toMatch(/£|GBP/);
        });

        it('無効な通貨コードでフォールバック形式を使用', () => {
            const formatted = formatCurrency(100, 'XXX');
            expect(formatted).toContain('100');
            // 無効な通貨コードの場合、ブラウザは汎用通貨記号（¤）を使用することがある
            // または数値 + 通貨コードのフォーマットになる
            expect(formatted === '¤100.00' || formatted.includes('XXX')).toBe(true);
        });

        it('ゼロをフォーマット', () => {
            const formatted = formatCurrency(0, 'USD');
            expect(formatted).toMatch(/\$0|USD\s*0/);
        });

        it('負の値をフォーマット', () => {
            const formatted = formatCurrency(-100, 'USD');
            expect(formatted).toContain('100');
        });
    });

    describe('キャッシュ管理', () => {
        const mockRates = {
            base_code: 'USD' as const,
            rates: {
                USD: 1,
                EUR: 0.85,
                JPY: 110,
            },
            time_last_update_unix: 1234567890,
        };

        describe('getCachedRatesUSD', () => {
            it('キャッシュが存在しない場合nullを返す', () => {
                expect(getCachedRatesUSD()).toBeNull();
            });

            it('有効なキャッシュを返す', () => {
                const now = Date.now();
                localStorage.setItem(
                    'itinerary-md-rates-usd',
                    JSON.stringify({
                        data: mockRates,
                        cachedAt: now,
                    })
                );

                expect(getCachedRatesUSD()).toEqual(mockRates);
            });

            it('期限切れのキャッシュでnullを返す', () => {
                const oldTime = Date.now() - 13 * 60 * 60 * 1000; // 13時間前
                localStorage.setItem(
                    'itinerary-md-rates-usd',
                    JSON.stringify({
                        data: mockRates,
                        cachedAt: oldTime,
                    })
                );

                expect(getCachedRatesUSD()).toBeNull();
            });

            it('不正なJSON形式でnullを返す', () => {
                localStorage.setItem('itinerary-md-rates-usd', 'invalid json');
                expect(getCachedRatesUSD()).toBeNull();
            });

            it('不完全なデータ形式でnullを返す', () => {
                localStorage.setItem(
                    'itinerary-md-rates-usd',
                    JSON.stringify({
                        data: { base_code: 'USD' },
                        cachedAt: Date.now(),
                    })
                );

                expect(getCachedRatesUSD()).toBeNull();
            });
        });

        describe('setCachedRatesUSD', () => {
            it('データをキャッシュに保存', () => {
                setCachedRatesUSD(mockRates);

                const stored = JSON.parse(localStorage.getItem('itinerary-md-rates-usd') || '{}');
                expect(stored.data).toEqual(mockRates);
                expect(stored.cachedAt).toBeLessThanOrEqual(Date.now());
            });

            it('localStorageエラーを無視', () => {
                const setItemMock = vi.fn().mockImplementation(() => {
                    throw new Error('Storage error');
                });
                localStorage.setItem = setItemMock;

                expect(() => setCachedRatesUSD(mockRates)).not.toThrow();
            });
        });

        describe('fetchRatesUSD', () => {
            it('APIから為替レートを取得', async () => {
                (global.fetch as Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockRates,
                });

                const result = await fetchRatesUSD();

                expect(result).toEqual(mockRates);
                expect(global.fetch).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
            });

            it('取得したデータをキャッシュに保存', async () => {
                (global.fetch as Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockRates,
                });

                await fetchRatesUSD();

                const cached = getCachedRatesUSD();
                expect(cached).toEqual(mockRates);
            });

            it('APIエラーで例外をスロー', async () => {
                (global.fetch as Mock).mockResolvedValueOnce({
                    ok: false,
                });

                await expect(fetchRatesUSD()).rejects.toThrow('Failed to fetch rates');
            });

            it('無効なレスポンスで例外をスロー', async () => {
                (global.fetch as Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ invalid: 'data' }),
                });

                await expect(fetchRatesUSD()).rejects.toThrow('Invalid rates payload');
            });
        });

        describe('initializeRates', () => {
            it('キャッシュがない場合に新しいレートを取得', async () => {
                (global.fetch as Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockRates,
                });

                await initializeRates();

                expect(global.fetch).toHaveBeenCalled();
                expect(getCachedRatesUSD()).toEqual(mockRates);
            });

            it('有効なキャッシュがある場合は取得をスキップ', async () => {
                setCachedRatesUSD(mockRates);

                await initializeRates();

                expect(global.fetch).not.toHaveBeenCalled();
            });

            it('エラーを警告として記録', async () => {
                const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
                (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

                await initializeRates();

                expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to initialize currency rates:', expect.any(Error));
                consoleWarnSpy.mockRestore();
            });
        });

        describe('getRatesUSD', () => {
            it('キャッシュされたレートを同期的に返す', () => {
                setCachedRatesUSD(mockRates);
                expect(getRatesUSD()).toEqual(mockRates);
            });

            it('キャッシュがない場合nullを返す', () => {
                expect(getRatesUSD()).toBeNull();
            });
        });
    });

    describe('COMMON_CURRENCIES', () => {
        it('一般的な通貨コードを含む', () => {
            expect(COMMON_CURRENCIES).toContain('USD');
            expect(COMMON_CURRENCIES).toContain('EUR');
            expect(COMMON_CURRENCIES).toContain('JPY');
            expect(COMMON_CURRENCIES).toContain('GBP');
        });
    });
});
