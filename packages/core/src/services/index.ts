import { DateTime } from 'luxon';
import type { VFile } from 'vfile';
import { coerceIanaTimeZone, isValidIanaTimeZone } from '../time/iana.js';

export interface TzService {
    // Validate input TZ as IANA; return null if invalid
    normalize(tz?: string | null): string | null;
    // Validate input TZ as IANA; if invalid, return fallback (also validated)
    coerce(tz?: string | null, fallback?: string | null): { tz: string | null; valid: boolean };
    // Validate only
    isValid(tz?: string | null): boolean;
}
export interface IsoService {
    toISO(dateISO: string | undefined, hh: number | null, mm: number | null, tz: string | null): string | null;
}
export interface UnicodeService {
    makeShadow(s: string): { shadow: string; map: (shadowIdx: number) => number };
}
export interface Logger {
    warn(msg: string): void;
}

export interface Policy {
    amHour: number;
    pmHour: number;
    allowUrlSchemes: string[];
    defaultTimezone: string | null;
    defaultCurrency?: string | null;
}

export interface Services {
    tz: TzService;
    iso: IsoService;
    unicode: UnicodeService;
    log?: Logger;
    policy: Policy;
    file?: VFile;
}

/**
 * Create default services set.
 *
 * Deprecated aliases supported for backward compatibility (will be removed in 0.2.0):
 * - Policy.tzFallback -> use Policy.defaultTimezone
 * - Policy.currencyFallback -> use Policy.defaultCurrency
 */
export function makeDefaultServices(policy: Partial<Policy> & { tzFallback?: string | null; currencyFallback?: string | null } = {}, file?: VFile): Services {
    // Map legacy fields to new names with a deprecation warning
    const legacyTz = (policy as { tzFallback?: string | null }).tzFallback;
    const legacyCurrency = (policy as { currencyFallback?: string | null }).currencyFallback;
    if (legacyTz != null) {
        try {
            console.warn('[itmd/core] Policy.tzFallback is deprecated and will be removed in 0.2.0. Use `defaultTimezone`.');
        } catch {}
    }
    if (legacyCurrency != null) {
        try {
            console.warn('[itmd/core] Policy.currencyFallback is deprecated and will be removed in 0.2.0. Use `defaultCurrency`.');
        } catch {}
    }

    const resolvedPolicy: Policy = {
        amHour: policy.amHour ?? 9,
        pmHour: policy.pmHour ?? 15,
        allowUrlSchemes: policy.allowUrlSchemes ?? ['http', 'https', 'mailto'],
        defaultTimezone: policy.defaultTimezone ?? legacyTz ?? null,
        defaultCurrency: policy.defaultCurrency ?? legacyCurrency ?? null,
    };

    const tz: TzService = {
        normalize: (tz) => {
            const out = coerceIanaTimeZone(tz);
            return out ?? null;
        },
        coerce: (tz, fb) => {
            const primary = coerceIanaTimeZone(tz);
            const normalized = primary ?? coerceIanaTimeZone(fb ?? undefined);
            const validInput = !!primary;
            return { tz: normalized ?? null, valid: validInput };
        },
        isValid: (tz) => {
            if (isValidIanaTimeZone(tz)) return true;
            return !!coerceIanaTimeZone(tz);
        },
    };

    const iso: IsoService = {
        toISO: (dateISO, hh, mm, tz) => {
            if (!dateISO || hh == null || mm == null) return null;
            const zone = tz || undefined;
            const dt = DateTime.fromISO(`${dateISO}T00:00`, { zone }).set({
                hour: hh,
                minute: mm,
                second: 0,
                millisecond: 0,
            });
            if (!dt.isValid) return null;
            return dt.toISO({
                suppressMilliseconds: true,
                suppressSeconds: true,
                includeOffset: true,
            }) as string;
        },
    };

    const unicode: UnicodeService = {
        makeShadow: (s: string) => ({ shadow: s, map: (i: number) => i }),
    };

    return { tz, iso, unicode, policy: resolvedPolicy, log: console, file };
}
