import { parseDateText } from '@itinerary-md/core';
import type { AnalyzeOptions, AnalyzeResult, Summary, TotalsBreakdown } from './types';

export function analyze(markdown: string, opts: AnalyzeOptions): AnalyzeResult {
    const summary = analyzeDates(markdown);
    const totals = analyzeCosts(markdown, opts.baseCurrency, opts.ratesUSDBase);
    return { summary, totals };
}

export function analyzeDates(markdown: string): Summary {
    const lines = markdown.split(/\r?\n/);
    const dates: string[] = [];
    for (const line of lines) {
        const h2 = line.startsWith('## ') ? line.slice(3).trim() : undefined;
        if (h2) {
            const dd = parseDateText(h2);
            if (dd?.date) dates.push(dd.date);
        }
    }
    dates.sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    let numDays: number | undefined;
    if (startDate && endDate) {
        try {
            const s = new Date(startDate);
            const e = new Date(endDate);
            const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (Number.isFinite(diff)) numDays = diff;
        } catch {}
    }
    return { startDate, endDate, numDays };
}

export function analyzeCosts(markdown: string, baseCurrency: string, rates: Record<string, number>): TotalsBreakdown {
    const TYPE_REGEX = /^(?:\s*\[.*\]\s*|\s*\[\]\s*)(flight|train|stay|meal|activity)\b/;
    const COST_VALUE_REGEX = /\b(cost|price)\s*:\s*(.+)$/;
    let total = 0;
    let currentType: 'flight' | 'train' | 'stay' | 'meal' | 'activity' | null = null;
    let transport = 0;
    let activity = 0;
    let meal = 0;
    const lines = markdown.split(/\r?\n/);
    for (const raw of lines) {
        const typeMatch = raw.match(TYPE_REGEX);
        if (typeMatch) {
            const matched = typeMatch[1] as 'flight' | 'train' | 'stay' | 'meal' | 'activity' | undefined;
            currentType = matched ?? null;
        }
        const m = raw.match(COST_VALUE_REGEX);
        if (!m) continue;
        const value = m[2].trim();
        const parsed = parseAmountWithCurrency(value, baseCurrency);
        if (parsed.amount == null) continue;
        const from = parsed.currency || baseCurrency;
        const to = baseCurrency;
        const converted = from === to ? parsed.amount : convertAmountUSDBase(parsed.amount, from, to, rates);
        if (converted == null) continue;
        total += converted;
        if (currentType === 'flight' || currentType === 'train') transport += converted;
        else if (currentType === 'activity') activity += converted;
        else if (currentType === 'meal') meal += converted;
    }
    return { total, transport, activity, meal };
}

function parseAmountWithCurrency(value: string, fallbackCurrency?: string): { amount: number | null; currency?: string } {
    const raw = value.trim();
    if (!raw) return { amount: null, currency: fallbackCurrency };
    const CODE_AT_END = /^(?:([A-Za-z]{3})\s*)?([+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]{3})?$/;
    const m = raw.match(CODE_AT_END);
    if (m) {
        const codePrefix = m[1];
        const numStr = m[2];
        const codeSuffix = m[3];
        const amt = Number(numStr.replace(/,/g, ''));
        const code = (codeSuffix || codePrefix)?.toUpperCase();
        return { amount: Number.isFinite(amt) ? amt : null, currency: code || fallbackCurrency };
    }
    const num = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(num)) return { amount: num, currency: fallbackCurrency };
    return { amount: null, currency: fallbackCurrency };
}

function convertAmountUSDBase(amount: number, from: string, to: string, rates: Record<string, number>): number | null {
    if (!Number.isFinite(amount)) return null;
    if (!from || !to) return null;
    if (from === to) return amount;
    const rateFrom = rates[from];
    const rateTo = rates[to];
    if (!rateFrom || !rateTo) return null;
    const usd = amount / rateFrom;
    const out = usd * rateTo;
    return out;
}
