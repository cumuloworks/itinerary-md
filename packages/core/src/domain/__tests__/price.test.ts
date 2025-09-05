import { describe, expect, it } from 'vitest';
import { normalizePriceLine } from '../price';

describe('itmd/price normalizePriceLine', () => {
    it('accepts currency code at head: "EUR 1.234,56" and allows trailing text', () => {
        const node = normalizePriceLine('EUR 1.234,56 per night');
        expect(node.tokens.length).toBe(1);
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.kind).toBe('money');
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('accepts currency code at tail: "1.234,56 EUR"', () => {
        const node = normalizePriceLine('1.234,56 EUR');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('accepts currency symbol: "€12,30" (European decimal)', () => {
        const node = normalizePriceLine('€12,30');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.meta?.symbol).toBe('€');
        expect(money.normalized.amount).toBe('12.3');
    });

    it('accepts currency symbol: "HK$ 1,234.56" (US decimal)', () => {
        const node = normalizePriceLine('HK$ 1,234.56');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('HKD');
        expect(money.meta?.symbol).toBe('HK$');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('trailing text: "USD 100 per night"', () => {
        const node = normalizePriceLine('USD 100 per night');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('USD');
        expect(money.normalized.amount).toBe('100');
    });

    it('fallback: parse numbers with default currency (1.234,56 -> 1234.56)', () => {
        const node = normalizePriceLine('1.234,56', 'eur');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
        expect(money.meta?.source).toBe('defaultCurrency');
    });
});
