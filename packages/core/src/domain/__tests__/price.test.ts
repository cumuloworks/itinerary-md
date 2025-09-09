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

    it('accepts no-space tail code: "24EUR"', () => {
        const node = normalizePriceLine('24EUR');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('24');
    });

    it('accepts no-space head code: "EUR24"', () => {
        const node = normalizePriceLine('EUR24');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('24');
    });

    it('fallback: parse numbers with default currency (1.234,56 -> 1234.56)', () => {
        const node = normalizePriceLine('1.234,56', 'eur');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
        expect(money.meta?.source).toBe('defaultCurrency');
    });

    it('adds currency-not-detected when missing code with defaultCurrency supplied', () => {
        const node = normalizePriceLine('24EU', 'USD');
        // No match for currency+amount pair; falls back to number + defaultCurrency
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('USD');
        expect(money.normalized.amount).toBe('24');
        expect(node.warnings?.includes('currency-not-detected')).toBe(true);
    });

    it('evaluates math in braces with currency after: "{25*4} EUR"', () => {
        const node = normalizePriceLine('{25*4} EUR');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('100');
        expect(node.flags.hasMath).toBe(true);
        expect(node.data.needsEvaluation).toBe(true);
    });

    it('evaluates math in braces with currency before: "EUR {10+5*2}"', () => {
        const node = normalizePriceLine('EUR {10+5*2}');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('20');
        expect(node.flags.hasMath).toBe(true);
    });

    it('evaluates division and parentheses in braces: "JPY {3000/3}"', () => {
        const node = normalizePriceLine('JPY {3000/3}');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('JPY');
        expect(money.normalized.amount).toBe('1000');
        expect(node.flags.hasMath).toBe(true);
    });
});
