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

    // Parse costString and convert to data.itmdPrice shape
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

    it('extracts date range from headings and shows number of days', () => {
        const root: { children: TestMdNode[] } = {
            children: [heading('2024-01-01'), heading('2024-01-03')],
        };
        render(<Statistics root={root} />);
        expect(screen.getAllByText('2024-01-01').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2024-01-03').length).toBeGreaterThan(0);
        expect(screen.getByText(/3 days/)).toBeInTheDocument();
    });

    it('aggregates total and breakdown (transportation/activity/stay) in USD', () => {
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
        // Total: 350 (ignore locale symbols/decimals; assert by number)
        expect(screen.getByText(/350/)).toBeInTheDocument();
        // Breakdown: numbers 100, 50, 200 appear
        expect(screen.getByText(/100/)).toBeInTheDocument();
        expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('converts EUR/JPY to USD with rates when available and sums', () => {
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
        // Total is around 200 (assert by partial number match)
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('sums with 1:1 conversion when rates are unavailable', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [
                itmdEvent('train', '80 EUR'), // レートなし→1:1 換算で集計
                itmdEvent('bus', '20 USD'), // 同通貨→集計
            ],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // Total is 100 (80 + 20). Total is shown in aria-live="polite"
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/100/);
    });

    it('currency normalization/validation: invalid frontmatter/props fall back to USD', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        // frontmatter currency invalid (e.g., 'U$' -> validation fails -> USD)
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '10 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'U$' }} />);
        // The same number appears in multiple places; check with getAllByText
        expect(screen.getAllByText(/10/).length).toBeGreaterThan(0);
    });

    it('currency normalization: trim/uppercase to 3 letters', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: { base_code: 'USD', rates: { USD: 1, EUR: 0.8 } }, ready: true });
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '10 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: '  eur  ' }} />);
        // 10 USD -> EUR conversion (0.8) shows a value around 8
        expect(screen.getAllByText(/8/).length).toBeGreaterThan(0);
    });

    it('uses 1:1 conversion when one side of rate is missing', () => {
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({
            data: { base_code: 'USD', rates: { USD: 1, EUR: 0.8 } }, // Missing JPY rate
            ready: true,
        });
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('train', '100 JPY')], // JPY->EUR (JPY missing) -> 1:1 => 100
        };
        render(<Statistics root={root} frontmatter={{ currency: 'EUR' }} />);
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/100/);
    });

    it('falls back to USD formatting when Intl.NumberFormat throws RangeError', () => {
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
            // If 50 appears, USD fallback formatting succeeded (may appear in multiple places)
            expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
        } finally {
            spy.mockRestore();
        }
    });

    it('supports fallback and normalization with data.itmdPrice format', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('bus', '30 USD'), itmdEvent('museum', '20 USD')],
        };
        render(<Statistics root={root} frontmatter={{ currency: 'USD' }} />);
        // Total 50
        expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('shows em dash (—) when data is missing', () => {
        render(<Statistics />);
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows budget from frontmatter and the difference vs total (1:1)', () => {
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

    it('prioritizes manual rate props to convert budget/total', () => {
        const root: { children: TestMdNode[] } = {
            children: [itmdEvent('train', '100 EUR')], // Apply 2.0 from EUR to USD
        };
        // Apply manual rate regardless of ratesHook
        const mockedUseRatesUSD = ratesHook.useRatesUSD as unknown as Mock;
        mockedUseRatesUSD.mockReturnValue({ data: null, ready: true });
        render(<Statistics root={root} frontmatter={{ currency: 'USD', budget: '200 EUR' }} rate={{ from: 'EUR', to: 'USD', value: 2 }} />);
        // Total 100 EUR -> 200 USD (may appear in multiple places; use getAllByText)
        expect(screen.getAllByText(/200/).length).toBeGreaterThan(0);
        // Budget 200 EUR -> 400 USD, 200 USD left
        const totalEl = document.querySelector('[aria-live="polite"]');
        expect(totalEl?.textContent || '').toMatch(/200/);
        expect(document.body.textContent || '').toMatch(/Budget/);
        expect(document.body.textContent || '').toMatch(/400/);
    });
});
