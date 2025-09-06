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
    tzFallback: string | null;
    currencyFallback?: string | null;
}

export interface Services {
    tz: TzService;
    iso: IsoService;
    unicode: UnicodeService;
    log?: Logger;
    policy: Policy;
    file?: VFile;
}

export function makeDefaultServices(policy: Partial<Policy> = {}, file?: VFile): Services {
    const resolvedPolicy: Policy = {
        amHour: policy.amHour ?? 9,
        pmHour: policy.pmHour ?? 15,
        allowUrlSchemes: policy.allowUrlSchemes ?? ['http', 'https', 'mailto'],
        tzFallback: policy.tzFallback ?? null,
        currencyFallback: policy.currencyFallback ?? null,
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
