import { Parser } from 'expr-eval';
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
        const fmt = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code.toUpperCase(),
        });
        const ro = fmt.resolvedOptions();
        // In most environments maximumFractionDigits equals the currency minor unit
        return typeof ro.maximumFractionDigits === 'number' ? ro.maximumFractionDigits : 2;
    } catch {
        return 2;
    }
}

function normalizeAmountString(rawNum: string): string {
    // Simplification policy:
    // - Treat the rightmost of '.' or ',' as the decimal separator
    // - Remove all other separators as thousands delimiters
    let t = String(rawNum).trim();
    if (!t) return '';
    let sign = '';
    if (t[0] === '+' || t[0] === '-') {
        sign = t[0];
        t = t.slice(1);
    }
    let integerPart = '';
    let fractionalPart = '';
    const lastDot = t.lastIndexOf('.');
    const lastComma = t.lastIndexOf(',');
    if (lastDot === -1 && lastComma === -1) {
        integerPart = t.replace(/[.,]/g, '');
    } else {
        const sepIndex = Math.max(lastDot, lastComma);
        const before = t.slice(0, sepIndex);
        const after = t.slice(sepIndex + 1);
        integerPart = before.replace(/[.,]/g, '');
        fractionalPart = after.replace(/[.,]/g, '');
    }
    if (!integerPart) integerPart = '0';
    integerPart = integerPart.replace(/^0+(?=\d)/, '');
    // Trim trailing zeros (e.g., 12,30 -> 12.3)
    fractionalPart = fractionalPart.replace(/0+$/, '');
    const normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
    const num = Number(sign + normalized);
    if (!Number.isFinite(num)) return '';
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

    // Evaluate simple math inside braces first, e.g. "{25*4} EUR" or "EUR {10+5}"
    let evaluatedLine = line;
    let hasMath = false;
    try {
        const parser = new Parser();
        evaluatedLine = line.replace(/\{([^{}]+)\}/g, (_, expr: string) => {
            hasMath = true;
            const trimmed = String(expr).trim();
            const result = parser.evaluate(trimmed);
            if (typeof result === 'number' && Number.isFinite(result)) return String(result);
            // If not a finite number, keep original braces
            warnings.push('math-eval-failed');
            return `{${expr}}`;
        });
    } catch {
        // Keep original line on any parser error
        warnings.push('math-eval-error');
        evaluatedLine = line;
    }

    // Simple single-term detector: CODE AMOUNT | AMOUNT CODE | SYMBOL AMOUNT (after brace evaluation)
    // Define a single number pattern that accepts optional thousands separators ("," or ".")
    // and allows an optional decimal part using either "." or ",".
    const NUM_RE = /[+-]?(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?/;
    const PATTERNS = [
        // Allow no space between code and number: "EUR24"
        new RegExp(`^(?<code>[A-Za-z]{3})\\s*(?<num>${NUM_RE.source})(?=\\s|$)`),
        // Allow no space between number and code: "24EUR"
        new RegExp(`^(?<num>${NUM_RE.source})\\s*(?<code>[A-Za-z]{3})(?=\\s|$)`),
        new RegExp(`^(?<sym>A\\$|C\\$|HK\\$|S\\$|[€¥£₩₫฿₱₽₺$])\\s*(?<num>${NUM_RE.source})(?=\\s|$)`),
    ];
    let match: RegExpMatchArray | null = null;
    let kind: 'codeFirst' | 'numFirst' | 'symbol' | null = null;
    for (let i = 0; i < PATTERNS.length; i += 1) {
        const pattern = PATTERNS[i];
        const m = evaluatedLine.match(pattern);
        if (m) {
            match = m;
            kind = i === 0 ? 'codeFirst' : i === 1 ? 'numFirst' : 'symbol';
            break;
        }
    }

    if (!match || !kind) {
        // As a fallback, try to detect currency anywhere and a number anywhere
        const { currency } = detectCurrency(evaluatedLine);
        const numM = evaluatedLine.match(NUM_RE);
        if (!currency && !numM) {
            return {
                type: 'itmdPrice',
                rawLine,
                tokens: [],
                flags: {
                    hasMath,
                    crossCurrency: false,
                    hasNumberOnlyTerm: true,
                },
                summary: { currencies: [], moneyCount: 0 },
                data: { normalized: true, needsEvaluation: true },
                warnings: [...(warnings.length ? warnings : []), 'unrecognized'],
            };
        }
        if (!currency && numM) {
            const rawNumStr = (numM[0] || '') as string;
            const numNorm = normalizeAmountString(rawNumStr);
            if (defaultCurrency?.trim()) {
                const cur = defaultCurrency.toUpperCase();
                const scale = inferScaleByCurrency(cur);
                // No currency detected but number present -> mark as currency-not-detected
                if (!warnings.includes('currency-not-detected')) warnings.push('currency-not-detected');
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
                    flags: {
                        hasMath,
                        crossCurrency: false,
                        hasNumberOnlyTerm: false,
                    },
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
                flags: {
                    hasMath,
                    crossCurrency: false,
                    hasNumberOnlyTerm: true,
                },
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
            flags: { hasMath, crossCurrency: false, hasNumberOnlyTerm: true },
            summary: { currencies: currency ? [currency] : [], moneyCount: 0 },
            data: { normalized: true, needsEvaluation: true },
            warnings: [...(warnings.length ? warnings : []), 'no-amount'],
        };
    }

    const groups = (match.groups || {}) as {
        code?: string;
        sym?: string;
        num?: string;
    };
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
        flags: { hasMath, crossCurrency: false, hasNumberOnlyTerm: false },
        summary: {
            currencies: currency ? [normalized.currency] : [],
            moneyCount: 1,
        },
        data: { normalized: true, needsEvaluation: true },
        warnings: warnings.length ? warnings.slice() : undefined,
    };
    return node;
}
