import { unformat as accountingUnformat } from 'accounting-js';

export type MoneyFragment = {
    kind: 'money';
    raw: string;
    currency: string;
    amount: string;
    normalized: {
        currency: string;
        amount: string;
        scale: number;
    };
    meta?: {
        symbol?: string;
        localeGuess?: string;
        source?: 'inline' | 'defaultCurrency' | 'symbolInferred';
    };
    position?: { start?: number; end?: number } | undefined;
    warnings?: string[];
};

export type PriceOperator = {
    kind: 'op';
    op: 'add' | 'sub' | 'mul' | 'div' | 'groupOpen' | 'groupClose';
    raw: string;
    position?: { start?: number; end?: number } | undefined;
};

export type PriceTokens = Array<
    | MoneyFragment
    | PriceOperator
    | {
          kind: 'number';
          raw: string;
          normalized: string;
      }
>;

export type PriceNode = {
    type: 'itmdPrice';
    rawLine: string;
    tokens: PriceTokens;
    flags: {
        hasMath: boolean;
        crossCurrency: boolean;
        hasNumberOnlyTerm: boolean;
    };
    summary: {
        currencies: string[];
        moneyCount: number;
    };
    data: {
        normalized: true;
        needsEvaluation: boolean;
    };
    position?: { start?: number; end?: number } | undefined;
    warnings?: string[];
};

const SYMBOL_TO_CODE: Record<string, string> = {
    '€': 'EUR',
    '¥': 'JPY',
    '£': 'GBP',
    '₩': 'KRW',
    '₫': 'VND',
    '฿': 'THB',
    '₱': 'PHP',
    '₽': 'RUB',
    '₺': 'TRY',
    A$: 'AUD',
    C$: 'CAD',
    HK$: 'HKD',
    S$: 'SGD',
    $: 'USD',
};

function inferScaleByCurrency(code: string): number {
    try {
        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: code.toUpperCase() });
        const ro = fmt.resolvedOptions();
        // In most environments maximumFractionDigits equals the currency minor unit
        return typeof ro.maximumFractionDigits === 'number' ? ro.maximumFractionDigits : 2;
    } catch {
        return 2;
    }
}

function normalizeAmountString(rawNum: string): string {
    // Accept both "," thousands and "." decimal or vice versa; rely on accounting to unformat
    const num = accountingUnformat(String(rawNum));
    if (!Number.isFinite(num)) return '';
    // Keep as string with full precision as provided (no rounding other than JS float)
    // To avoid scientific notation, convert via toString and ensure decimal point is '.'
    return String(num);
}

function detectCurrency(raw: string): { currency?: string; symbol?: string } {
    const mEnd = raw.match(/\b([A-Za-z]{3})\b(?![\w])/);
    const mStart = raw.match(/^\s*([A-Za-z]{3})\b/);
    let code: string | undefined;
    if (mStart) code = mStart[1]?.toUpperCase();
    else if (mEnd) code = mEnd[1]?.toUpperCase();
    // Symbols like € 100, A$120
    const sym = raw.match(/(A\$|C\$|HK\$|S\$|[€¥£₩₫฿₱₽₺$])/);
    if (!code && sym) {
        const s = sym[1];
        code = SYMBOL_TO_CODE[s as keyof typeof SYMBOL_TO_CODE];
        return { currency: code, symbol: s };
    }
    return { currency: code };
}

export function normalizePriceLine(rawLine: string, defaultCurrency?: string): PriceNode {
    const line = (rawLine || '').trim();
    const warnings: string[] = [];
    if (!line) {
        return {
            type: 'itmdPrice',
            rawLine,
            tokens: [],
            flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: true },
            summary: { currencies: [], moneyCount: 0 },
            data: { normalized: true, needsEvaluation: true },
            warnings: ['empty'],
        };
    }

    // Simple single-term detector: CODE AMOUNT | AMOUNT CODE | SYMBOL AMOUNT
    const PATTERNS = [
        /^(?<code>[A-Za-z]{3})\s+(?<num>[+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)(?![^\s])/,
        /^(?<num>[+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\s+(?<code>[A-Za-z]{3})(?![^\s])/,
        /^(?<sym>A\$|C\$|HK\$|S\$|[€¥£₩₫฿₱₽₺$])\s*(?<num>[+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/,
    ];
    let match: RegExpMatchArray | null = null;
    let kind: 'codeFirst' | 'numFirst' | 'symbol' | null = null;
    for (let i = 0; i < PATTERNS.length; i += 1) {
        const pattern = PATTERNS[i];
        const m = line.match(pattern);
        if (m) {
            match = m;
            kind = i === 0 ? 'codeFirst' : i === 1 ? 'numFirst' : 'symbol';
            break;
        }
    }

    if (!match || !kind) {
        // As a fallback, try to detect currency anywhere and a number anywhere
        const { currency } = detectCurrency(line);
        const numM = line.match(/[+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?/);
        if (!currency && !numM) {
            return {
                type: 'itmdPrice',
                rawLine,
                tokens: [],
                flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: true },
                summary: { currencies: [], moneyCount: 0 },
                data: { normalized: true, needsEvaluation: true },
                warnings: ['unrecognized'],
            };
        }
        if (!currency && numM) {
            const rawNumStr = (numM[0] || '') as string;
            const numNorm = normalizeAmountString(rawNumStr);
            if (defaultCurrency && defaultCurrency.trim()) {
                const cur = defaultCurrency.toUpperCase();
                const scale = inferScaleByCurrency(cur);
                const money: MoneyFragment = {
                    kind: 'money',
                    raw: line,
                    currency: cur,
                    amount: numNorm,
                    normalized: { currency: cur, amount: numNorm, scale },
                    meta: { source: 'defaultCurrency' },
                    warnings: warnings.length ? warnings.slice() : undefined,
                };
                const tokens: PriceTokens = [money];
                return {
                    type: 'itmdPrice',
                    rawLine,
                    tokens,
                    flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: false },
                    summary: { currencies: [cur], moneyCount: 1 },
                    data: { normalized: true, needsEvaluation: true },
                    warnings: warnings.length ? warnings.slice() : undefined,
                };
            }
            // No default currency – treat as number only
            const tokens: PriceTokens = [{ kind: 'number', raw: rawNumStr, normalized: numNorm }];
            return {
                type: 'itmdPrice',
                rawLine,
                tokens,
                flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: true },
                summary: { currencies: [], moneyCount: 0 },
                data: { normalized: true, needsEvaluation: true },
                warnings,
            };
        }
        // currency found but number missing
        return {
            type: 'itmdPrice',
            rawLine,
            tokens: [],
            flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: true },
            summary: { currencies: currency ? [currency] : [], moneyCount: 0 },
            data: { normalized: true, needsEvaluation: true },
            warnings: ['no-amount'],
        };
    }

    const groups = (match.groups || {}) as { code?: string; sym?: string; num?: string };
    const code = groups.code?.toUpperCase();
    const sym = groups.sym;
    const rawNum = groups.num;
    const currency = code || (sym ? SYMBOL_TO_CODE[sym] : undefined) || defaultCurrency;
    const amount = rawNum ? normalizeAmountString(rawNum) : '';
    const scale = currency ? inferScaleByCurrency(currency) : 2;
    const normalized: MoneyFragment['normalized'] = {
        currency: (currency || '').toUpperCase(),
        amount,
        scale,
    };
    const source: 'inline' | 'defaultCurrency' | 'symbolInferred' | undefined = code ? 'inline' : sym ? 'symbolInferred' : defaultCurrency ? 'defaultCurrency' : undefined;

    if (!currency) warnings.push('currency-not-detected');
    if (!amount) warnings.push('amount-not-detected');

    const money: MoneyFragment = {
        kind: 'money',
        raw: line,
        currency: normalized.currency,
        amount,
        normalized,
        meta: { symbol: sym, source },
        warnings: warnings.length ? warnings.slice() : undefined,
    };

    const tokens: PriceTokens = [money];
    const node: PriceNode = {
        type: 'itmdPrice',
        rawLine,
        tokens,
        flags: { hasMath: false, crossCurrency: false, hasNumberOnlyTerm: false },
        summary: { currencies: currency ? [normalized.currency] : [], moneyCount: 1 },
        data: { normalized: true, needsEvaluation: true },
        warnings: warnings.length ? warnings.slice() : undefined,
    };
    return node;
}
