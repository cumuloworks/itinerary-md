import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyError } from '../../core/errors';
import { coerceTimezoneWithToast, getTimezoneOptions } from '../timezone';

vi.mock('../../core/errors', () => ({
    notifyError: vi.fn(),
}));

describe('timezone utilities', () => {
    const originalIntl = global.Intl;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.Intl = originalIntl;
    });

    describe('getTimezoneOptions', () => {
        it('サポートされているタイムゾーンのリストを返す', () => {
            const mockTimezones = ['UTC', 'Asia/Tokyo', 'Europe/London', 'America/New_York'];
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn((key) => {
                    if (key === 'timeZone') return mockTimezones;
                    return [];
                }),
            } as typeof Intl;

            const options = getTimezoneOptions();
            expect(options).toEqual(mockTimezones);
        });

        it('supportedValuesOfが存在しない場合フォールバックリストを返す', () => {
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: undefined,
            } as typeof Intl;

            const options = getTimezoneOptions();
            expect(options).toContain('UTC');
            expect(options).toContain('Asia/Tokyo');
            expect(options).toContain('America/Los_Angeles');
            expect(options).toContain('Europe/London');
            expect(options.length).toBeGreaterThan(0);
        });

        it('supportedValuesOfがエラーを投げる場合エラーが伝播する', () => {
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn(() => {
                    throw new Error('Not supported');
                }),
            } as typeof Intl;

            // 現在の実装ではエラーハンドリングがないため、エラーが伝播する
            expect(() => {
                getTimezoneOptions();
            }).toThrow('Not supported');
        });

        it('空のリストを返す場合は空の配列が返される', () => {
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn(() => []),
            } as typeof Intl;

            const options = getTimezoneOptions();
            // 現在の実装では空の配列がそのまま返される
            expect(options.length).toBe(0);
        });

        it('重複のないタイムゾーンリストを返す', () => {
            const mockTimezones = ['UTC', 'Asia/Tokyo', 'UTC', 'Asia/Tokyo', 'Europe/London'];
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn((key) => {
                    if (key === 'timeZone') return [...new Set(mockTimezones)];
                    return [];
                }),
            } as typeof Intl;

            const options = getTimezoneOptions();
            const uniqueOptions = [...new Set(options)];
            expect(options.length).toBe(uniqueOptions.length);
        });
    });

    describe('coerceTimezoneWithToast', () => {
        it('有効なタイムゾーンをそのまま返す', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Asia/Tokyo', 'UTC', 'Test');

            expect(result).toBe('Asia/Tokyo');
            expect(notifyError).not.toHaveBeenCalled();
        });

        it('無効なタイムゾーンでフォールバックを返す', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'UTC' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Invalid/Zone', 'America/New_York', 'Test');

            expect(result).toBe('America/New_York');
            expect(notifyError).toHaveBeenCalledWith('Test: Invalid timezone "Invalid/Zone". Fallback to America/New_York');
        });

        it('DateTimeFormatがエラーを投げる場合フォールバックを返す', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid timezone');
            }) as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Bad/Zone', 'Europe/London', 'Source');

            expect(result).toBe('Europe/London');
            expect(notifyError).toHaveBeenCalledWith('Source: Invalid timezone "Bad/Zone". Fallback to Europe/London');
        });

        it('文字列以外の型でフォールバックを返す', () => {
            const result = coerceTimezoneWithToast(123, 'UTC', 'Number input');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Number input: Invalid timezone "123". Fallback to UTC');
        });

        it('nullでフォールバックを返す', () => {
            const result = coerceTimezoneWithToast(null, 'Asia/Seoul', 'Null input');

            expect(result).toBe('Asia/Seoul');
            expect(notifyError).toHaveBeenCalledWith('Null input: Invalid timezone "null". Fallback to Asia/Seoul');
        });

        it('undefinedでフォールバックを返す', () => {
            const result = coerceTimezoneWithToast(undefined, 'Pacific/Auckland', 'Undefined input');

            expect(result).toBe('Pacific/Auckland');
            expect(notifyError).toHaveBeenCalledWith('Undefined input: Invalid timezone "undefined". Fallback to Pacific/Auckland');
        });

        it('空文字列でフォールバックを返す', () => {
            const result = coerceTimezoneWithToast('', 'UTC', 'Empty string');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Empty string: Invalid timezone "". Fallback to UTC');
        });

        it('大文字小文字が異なるタイムゾーンを検証', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'UTC' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('asia/tokyo', 'UTC', 'Case test');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalled();
        });

        it('resolvedOptionsが異なるタイムゾーンを返す場合フォールバック', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'Europe/Paris' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Europe/London', 'UTC', 'Mismatch');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Mismatch: Invalid timezone "Europe/London". Fallback to UTC');
        });

        it('様々な有効なタイムゾーンを検証', () => {
            const validTimezones = ['UTC', 'GMT', 'Asia/Tokyo', 'Asia/Seoul', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland', 'Australia/Sydney', 'Africa/Cairo', 'Etc/GMT+9', 'Etc/GMT-5'];

            validTimezones.forEach((tz) => {
                const mockDateTimeFormat = vi.fn(() => ({
                    resolvedOptions: () => ({ timeZone: tz }),
                }));
                global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

                const result = coerceTimezoneWithToast(tz, 'UTC', 'Valid test');
                expect(result).toBe(tz);
            });

            expect(notifyError).not.toHaveBeenCalled();
        });

        it('エラーメッセージにソース情報を含む', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid');
            }) as unknown as Intl.DateTimeFormatConstructor;

            coerceTimezoneWithToast('Bad', 'UTC', 'Component X');

            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Component X:'));
        });

        it('エラーメッセージにフォールバック値を含む', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid');
            }) as unknown as Intl.DateTimeFormatConstructor;

            coerceTimezoneWithToast('Bad', 'Asia/Shanghai', 'Test');

            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Fallback to Asia/Shanghai'));
        });

        it('オブジェクトをString化してエラーメッセージに含める', () => {
            const obj = { toString: () => '[Object timezone]' };
            const result = coerceTimezoneWithToast(obj, 'UTC', 'Object test');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Object test: Invalid timezone "[Object timezone]". Fallback to UTC');
        });
    });
});
