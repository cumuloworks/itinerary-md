export type CurrencyCode = string;

export type RatesUSDBase = {
    base_code: 'USD';
    rates: Record<string, number>;
    time_last_update_unix?: number;
};

const RATES_STORAGE_KEY = 'itinerary-md-rates-usd';
const RATES_TTL_MS = 12 * 60 * 60 * 1000;

export const COMMON_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW', 'SGD', 'THB', 'HKD'];

export const getCachedRatesUSD = (): RatesUSDBase | null => {
    try {
        const raw = localStorage.getItem(RATES_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data: RatesUSDBase; cachedAt: number };
        if (!parsed?.data?.rates) return null;
        const now = Date.now();
        if (now - parsed.cachedAt > RATES_TTL_MS) return null;
        return parsed.data;
    } catch {
        return null;
    }
};

export const setCachedRatesUSD = (data: RatesUSDBase) => {
    try {
        localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch {}
};

export const fetchRatesUSD = async (): Promise<RatesUSDBase> => {
    const endpoint = 'https://open.er-api.com/v6/latest/USD';
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Failed to fetch rates');
    const json = (await res.json()) as {
        base_code: 'USD';
        rates: Record<string, number>;
        time_last_update_unix?: number;
    };
    if (!json?.rates) throw new Error('Invalid rates payload');
    const data: RatesUSDBase = {
        base_code: 'USD',
        rates: json.rates,
        time_last_update_unix: json.time_last_update_unix,
    };
    setCachedRatesUSD(data);
    return data;
};

/**
 * Pre-fetch currency rates during app startup.
 * If the cache is expired (TTL), fetch fresh rates.
 */
export const initializeRates = async (): Promise<void> => {
    try {
        const cached = getCachedRatesUSD();
        if (!cached) {
            await fetchRatesUSD();
        }
    } catch (error) {
        console.warn('Failed to initialize currency rates:', error);
    }
};

/**
 * Get cached rates synchronously.
 * Assumes initializeRates() has pre-fetched at app startup.
 */
export const getRatesUSD = (): RatesUSDBase | null => {
    return getCachedRatesUSD();
};

const SYMBOL_TO_CODE: Record<string, CurrencyCode> = {
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

export const parseAmountWithCurrency = (value: string, fallbackCurrency?: CurrencyCode): { amount: number | null; currency?: CurrencyCode; raw: string } => {
    const raw = value.trim();
    if (!raw) return { amount: null, currency: fallbackCurrency, raw: value };
    // Allow optional trailing qualifiers (e.g., "/night", "per person") after currency code
    const CODE_AT_END = /^([+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]{3})\b/;
    const codeAtEnd = raw.match(CODE_AT_END);
    if (codeAtEnd) {
        const amt = Number(codeAtEnd[1].replace(/,/g, ''));
        const code = codeAtEnd[2].toUpperCase();
        return {
            amount: Number.isFinite(amt) ? amt : null,
            currency: code,
            raw: value,
        };
    }
    // Allow optional trailing qualifiers after the amount (e.g., "EUR 320/night")
    const CODE_AT_START = /^([A-Za-z]{3})\s*([+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\b/;
    const codeAtStart = raw.match(CODE_AT_START);
    if (codeAtStart) {
        const amt = Number(codeAtStart[2].replace(/,/g, ''));
        const code = codeAtStart[1].toUpperCase();
        return {
            amount: Number.isFinite(amt) ? amt : null,
            currency: code,
            raw: value,
        };
    }
    // Prefer matching long plain-digit sequences first (e.g., 11000) to avoid capturing only the first 1-3 digits
    const SYMBOL_AND_NUM = /^([€¥£₩₫฿₱₽₺$]|A\$|C\$|HK\$|S\$)?\s*([+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/;
    const symbolMatch = raw.match(SYMBOL_AND_NUM);
    if (symbolMatch) {
        const symbol = symbolMatch[1];
        const amt = Number(symbolMatch[2].replace(/,/g, ''));
        const code = symbol ? SYMBOL_TO_CODE[symbol] : undefined;
        return {
            amount: Number.isFinite(amt) ? amt : null,
            currency: code || fallbackCurrency,
            raw: value,
        };
    }
    const num = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(num)) return { amount: num, currency: fallbackCurrency, raw: value };
    return { amount: null, currency: fallbackCurrency, raw: value };
};

export const convertAmountUSDBase = (amount: number, from: CurrencyCode, to: CurrencyCode, rates: Record<string, number>): number | null => {
    if (!Number.isFinite(amount)) return null;
    if (!from || !to) return null;
    if (from === to) return amount;
    const rateFrom = rates[from];
    const rateTo = rates[to];
    if (!rateFrom || !rateTo) return null;
    const usd = amount / rateFrom;
    const out = usd * rateTo;
    return out;
};

export const formatCurrency = (amount: number, code: CurrencyCode): string => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol',
        }).format(amount);
    } catch {
        return `${amount.toLocaleString()} ${code}`;
    }
};
