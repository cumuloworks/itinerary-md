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
const itmdEvent = (eventType: string, costString?: string): TestMdNode => {
    if (!costString) return { type: 'itmdEvent', eventType };

    // costStringを解析してdata.itmdPrice形式に変換
    const parts = costString.split(' ');
    const amount = parts[0];
    const currency = parts[1] || 'USD';

    return {
        type: 'itmdEvent',
        eventType,
        data: {
            itmdPrice: [
                {
                    key: 'cost',
                    raw: costString,
                    price: {
                        tokens: [
                            {
                                kind: 'money',
                                amount,
                                currency,
                                normalized: { amount, currency },
                            },
                        ],
                    },
                },
            ],
        },
    };
};

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
                itmdEvent('flight', '100 USD'), // transportation
                itmdEvent('stay', '200 USD'), // stay
                itmdEvent('museum', '50 USD'), // activity
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
                itmdEvent('train', '80 EUR'), // 80 EUR → 100 USD
                itmdEvent('stay', '11000 JPY'), // 11000 JPY → 100 USD
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計は概ね 200（表記ゆれ回避のため数値を部分一致で確認）
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('為替レートが無い場合は異通貨も 1:1 で合計に含める', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [
                itmdEvent('train', '80 EUR'), // レートなし→1:1 換算で集計
                itmdEvent('bus', '20 USD'), // 同通貨→集計
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計は 100（80 + 20）。合計は aria-live="polite" に表示
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/100/);
    });

    it('通貨コードの正規化と検証: frontmatter/props の無効値は USD にフォールバック', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        // frontmatter の通貨が無効（例: 'U$' → 検証失敗→USD）
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '10 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'U$' }} />);
        // 複数箇所に同じ数値が出るため、getAllByText で確認
        expect(screen.getAllByText(/10/).length).toBeGreaterThan(0);
    });

    it('通貨コードの正規化: 小文字や空白を大文字3文字に整形して使用', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: { base_code: 'USD', rates: { USD: 1, EUR: 0.8 } }, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '10 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: '  eur  ' }} />);
        // 10 USD -> EUR 変換（0.8）で 8 相当が表示される
        expect(screen.getAllByText(/8/).length).toBeGreaterThan(0);
    });

    it('レートが片側欠損の場合は 1:1 換算で合計に含める', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({
            data: { base_code: 'USD', rates: { USD: 1, EUR: 0.8 } }, // JPY レート欠損
            ready: true,
        });
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('train', '100 JPY')], // JPY→EUR（JPYが欠損）→1:1 で 100
        };
        render(<Statistics root={root} frontmatter={{ currency: 'EUR' }} />);
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/100/);
    });

    it('Intl.NumberFormat が RangeError の場合は USD フォールバックでフォーマット', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '50 USD')],
        };
        const originalCtor = Intl.NumberFormat;
        const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(((locales?: unknown, options?: unknown) => {
            const opts = options as Intl.NumberFormatOptions | undefined;
            if (opts && opts.currency === 'EUR') {
                throw new RangeError('invalid currency');
            }
            return new originalCtor(locales as string | string[] | undefined, opts);
        }) as unknown as typeof Intl.NumberFormat);
        try {
            render(<Statistics root={root} frontmatter={{ currency: 'EUR' }} />);
            // 50 が表示されれば、USD フォールバックでフォーマット成功（複数箇所の可能性あり）
            expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
        } finally {
            spy.mockRestore();
        }
    });

    it('data.itmdPrice形式でフォールバックと正規化に対応する', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '30 USD'), itmdEvent('museum', '20 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // 合計 50
        expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('データがない場合はダッシュ(—)を表示する', () => {
        render(<Statistics />);
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('frontmatterのbudgetを表示し、合計との差分を示す (1:1)', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '100 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD', budget: '250 USD' }} />);
        // Budget 250, Total 100 => 150 left / 40% used
        expect(screen.getByText(/Budget/i)).toBeInTheDocument();
        expect(screen.getByText(/250/)).toBeInTheDocument();
        expect(screen.getByText(/left|over/i)).toBeInTheDocument();
        expect(screen.getByText(/% used/i)).toBeInTheDocument();
    });

    it('rate props がある場合は手動レートを優先してbudget/合計を換算', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('train', '100 EUR')], // EUR → USD に 2.0 を適用
        };
        // ratesHookは関係なく、手動レートを適用
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        render(<Statistics root={root} frontmatter={{ currency: 'USD', budget: '200 EUR' }} rate={{ from: 'EUR', to: 'USD', value: 2 }} />);
        // Total 100 EUR → 200 USD（複数箇所に表れる可能性があるためAllを使用）
        expect(screen.getAllByText(/200/).length).toBeGreaterThan(0);
        // Budget 200 EUR → 400 USD、残りは 200 USD left
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/200/);
        expect(document.body.textContent || '').toMatch(/Budget/);
        expect(document.body.textContent || '').toMatch(/400/);
    });
});
