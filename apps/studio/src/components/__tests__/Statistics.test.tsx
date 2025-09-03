import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import * as ratesHook from '../../hooks/useRatesUSD';
import { Statistics } from '../itinerary/Statistics';

vi.mock('../../hooks/useRatesUSD', () => {
    return {
        useRatesUSD: vi.fn(() => ({ data: null, ready: true })),
    };
});

// Compatible mdast-like type for tests
interface TestMdNode {
    type?: string;
    depth?: number;
    children?: unknown[];
    position?: { start?: { line?: number }; end?: { line?: number } };
    // extra fields allowed by structural typing
    [key: string]: unknown;
}

const heading = (text: string): TestMdNode => ({ type: 'itmdHeading', dateISO: text });
const itmdEvent = (eventType: string, meta?: Record<string, unknown> | null): TestMdNode => ({ type: 'itmdEvent', eventType, meta });

describe('Statistics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ヘッダから日付レンジを抽出し日数を表示する', () => {
        const root: { children: TestMdNode[] } = {
            children: [heading('2024-01-01'), heading('2024-01-03')],
        };
        render(<Statistics root={root} />);
        expect(screen.getAllByText('2024-01-01').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2024-01-03').length).toBeGreaterThan(0);
        expect(screen.getByText(/3 days/)).toBeInTheDocument();
    });

    it('USDでの合計と内訳(transportation/activity/stay)を集計する', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [
                itmdEvent('flight', { cost: '100 USD' }), // transportation
                itmdEvent('stay', { cost: '200 USD' }), // stay
                itmdEvent('museum', { cost: '50 USD' }), // activity
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計: 350（ロケール依存の記号/小数は無視して数値で確認）
        expect(screen.getByText(/350/)).toBeInTheDocument();
        // 内訳: 100, 50, 200 の数値が表示される
        expect(screen.getByText(/100/)).toBeInTheDocument();
        expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('為替レートがある場合にEUR/JPYからUSDへ換算して合計する', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({
            data: {
                base_code: 'USD',
                rates: { USD: 1, EUR: 0.8, JPY: 110 },
            },
            ready: true,
        });
        const root: { children: TestMdNode[] } = {
            children: [
                itmdEvent('train', { cost: 'EUR 80' }), // 80 EUR → 100 USD
                itmdEvent('stay', { cost: '¥11000' }), // 11000 JPY → 100 USD
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計は概ね 200（表記ゆれ回避のため数値を部分一致で確認）
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('為替レートが無い場合は異通貨は合計に含めない', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [
                itmdEvent('train', { cost: 'EUR 80' }), // レートなし→除外
                itmdEvent('bus', { cost: 'USD 20' }), // 同通貨→集計
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計は20のみ（合計は aria-live="polite" に表示）
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/20/);
    });

    it('meta.price フォールバックと配列メタの正規化に対応する', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', { price: '30 USD' }), itmdEvent('museum', { cost: [{ type: 'text', value: '20 USD' }] as unknown[] })],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計 50
        expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('データがない場合はダッシュ(—)を表示する', () => {
        render(<Statistics />);
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
});
