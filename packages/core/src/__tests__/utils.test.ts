import { describe, expect, it } from 'vitest';
import { normalizeCurrency, normalizeTimezone } from '../utils.js';

describe('utils.normalizeTimezone', () => {
    it('returns valid IANA as-is', () => {
        expect(normalizeTimezone('Asia/Tokyo')).toBe('Asia/Tokyo');
    });

    it('coerces GMT/UTC offsets to UTC±HH:MM', () => {
        expect(normalizeTimezone('UTC+9')).toBe('UTC+09:00');
        expect(normalizeTimezone('GMT+09:00')).toBe('UTC+09:00');
        expect(normalizeTimezone('+0530')).toBe('UTC+05:30');
        expect(normalizeTimezone('-5')).toBe('UTC-05:00');
        expect(normalizeTimezone('UTC')).toBe('UTC+00:00');
    });

    it('falls back to provided fallback for invalid tz', () => {
        expect(normalizeTimezone('Invalid/Zone', 'Asia/Tokyo')).toBe('Asia/Tokyo');
        expect(normalizeTimezone('', null)).toBeNull();
    });
});

describe('utils.normalizeCurrency', () => {
    it('uppercases and trims to 3 letters', () => {
        expect(normalizeCurrency(' eur ')).toBe('EUR');
        expect(normalizeCurrency('jpy')).toBe('JPY');
    });

    it('falls back to USD for invalid', () => {
        expect(normalizeCurrency('U$')).toBe('USD');
        expect(normalizeCurrency('')).toBe('USD');
    });

    it('respects custom fallback', () => {
        expect(normalizeCurrency('xx', 'JPY')).toBe('JPY');
    });
});
