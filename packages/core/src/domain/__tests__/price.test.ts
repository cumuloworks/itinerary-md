import { describe, expect, it } from 'vitest';
import { normalizePriceLine } from '../price';

describe('itmd/price normalizePriceLine', () => {
    it('通貨コード先頭: EUR 1.234,56 を受理し trailing text も許可', () => {
        const node = normalizePriceLine('EUR 1.234,56 per night');
        expect(node.tokens.length).toBe(1);
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.kind).toBe('money');
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('通貨コード後尾: 1.234,56 EUR を受理', () => {
        const node = normalizePriceLine('1.234,56 EUR');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('通貨記号: €12,30 を受理 (欧州小数)', () => {
        const node = normalizePriceLine('€12,30');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.meta?.symbol).toBe('€');
        expect(money.normalized.amount).toBe('12.3');
    });

    it('通貨記号: HK$ 1,234.56 を受理 (米国小数)', () => {
        const node = normalizePriceLine('HK$ 1,234.56');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('HKD');
        expect(money.meta?.symbol).toBe('HK$');
        expect(money.normalized.amount).toBe('1234.56');
    });

    it('トレーリングテキスト: USD 100 per night', () => {
        const node = normalizePriceLine('USD 100 per night');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('USD');
        expect(money.normalized.amount).toBe('100');
    });

    it('フォールバック: デフォルト通貨で数値のみを解釈 (1.234,56 -> 1234.56)', () => {
        const node = normalizePriceLine('1.234,56', 'eur');
        const money = node.tokens[0] as Extract<(typeof node.tokens)[number], { kind: 'money' }>;
        expect(money.normalized.currency).toBe('EUR');
        expect(money.normalized.amount).toBe('1234.56');
        expect(money.meta?.source).toBe('defaultCurrency');
    });
});
