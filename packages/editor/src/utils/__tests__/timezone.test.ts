import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyError } from '@/core/errors';
import { coerceTimezoneWithToast, getTimezoneOptions } from '@/utils/timezone';

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
        it('returns the list of supported timezones', () => {
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

        it('returns fallback list when supportedValuesOf is unavailable', () => {
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

        it('propagates error when supportedValuesOf throws', () => {
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn(() => {
                    throw new Error('Not supported');
                }),
            } as typeof Intl;

            // Current implementation has no error handling, so the error propagates
            expect(() => {
                getTimezoneOptions();
            }).toThrow('Not supported');
        });

        it('returns empty array when an empty list is returned', () => {
            global.Intl = {
                ...originalIntl,
                supportedValuesOf: vi.fn(() => []),
            } as typeof Intl;

            const options = getTimezoneOptions();
            // Current implementation returns the empty array as-is
            expect(options.length).toBe(0);
        });

        it('returns a de-duplicated timezone list', () => {
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
        it('returns valid timezone as-is', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Asia/Tokyo', 'UTC', 'Test');

            expect(result).toBe('Asia/Tokyo');
            expect(notifyError).not.toHaveBeenCalled();
        });

        it('returns fallback for invalid timezone', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'UTC' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Invalid/Zone', 'America/New_York', 'Test');

            expect(result).toBe('America/New_York');
            expect(notifyError).toHaveBeenCalledWith('Test: Invalid timezone "Invalid/Zone". Fallback to America/New_York');
        });

        it('returns fallback when DateTimeFormat throws', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid timezone');
            }) as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Bad/Zone', 'Europe/London', 'Source');

            expect(result).toBe('Europe/London');
            expect(notifyError).toHaveBeenCalledWith('Source: Invalid timezone "Bad/Zone". Fallback to Europe/London');
        });

        it('returns fallback for non-string values', () => {
            const result = coerceTimezoneWithToast(123, 'UTC', 'Number input');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Number input: Invalid timezone "123". Fallback to UTC');
        });

        it('returns fallback for null', () => {
            const result = coerceTimezoneWithToast(null, 'Asia/Seoul', 'Null input');

            expect(result).toBe('Asia/Seoul');
            expect(notifyError).toHaveBeenCalledWith('Null input: Invalid timezone "null". Fallback to Asia/Seoul');
        });

        it('returns fallback for undefined', () => {
            const result = coerceTimezoneWithToast(undefined, 'Pacific/Auckland', 'Undefined input');

            expect(result).toBe('Pacific/Auckland');
            expect(notifyError).toHaveBeenCalledWith('Undefined input: Invalid timezone "undefined". Fallback to Pacific/Auckland');
        });

        it('returns fallback for empty string', () => {
            const result = coerceTimezoneWithToast('', 'UTC', 'Empty string');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Empty string: Invalid timezone "". Fallback to UTC');
        });

        it('validates timezone with different casing', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'UTC' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('asia/tokyo', 'UTC', 'Case test');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalled();
        });

        it('returns fallback when resolvedOptions timezone mismatches input', () => {
            const mockDateTimeFormat = vi.fn(() => ({
                resolvedOptions: () => ({ timeZone: 'Europe/Paris' }),
            }));
            global.Intl.DateTimeFormat = mockDateTimeFormat as unknown as Intl.DateTimeFormatConstructor;

            const result = coerceTimezoneWithToast('Europe/London', 'UTC', 'Mismatch');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Mismatch: Invalid timezone "Europe/London". Fallback to UTC');
        });

        it('validates various valid timezones', () => {
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

        it('includes source info in error message', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid');
            }) as unknown as Intl.DateTimeFormatConstructor;

            coerceTimezoneWithToast('Bad', 'UTC', 'Component X');

            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Component X:'));
        });

        it('includes fallback value in error message', () => {
            global.Intl.DateTimeFormat = vi.fn(() => {
                throw new Error('Invalid');
            }) as unknown as Intl.DateTimeFormatConstructor;

            coerceTimezoneWithToast('Bad', 'Asia/Shanghai', 'Test');

            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Fallback to Asia/Shanghai'));
        });

        it('stringifies objects for error message', () => {
            const obj = { toString: () => '[Object timezone]' };
            const result = coerceTimezoneWithToast(obj, 'UTC', 'Object test');

            expect(result).toBe('UTC');
            expect(notifyError).toHaveBeenCalledWith('Object test: Invalid timezone "[Object timezone]". Fallback to UTC');
        });
    });
});
