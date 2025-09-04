import { DateTime } from 'luxon';
import type { VFile } from 'vfile';
import { coerceIanaTimeZone, isValidIanaTimeZone } from '../time/iana';

export interface TzService {
    // 入力TZをIANAとして検証し、無効ならnullを返す
    normalize(tz?: string | null): string | null;
    // 入力TZをIANAとして検証し、無効ならfallbackを返す（fallbackも検証）
    coerce(tz?: string | null, fallback?: string | null): { tz: string | null; valid: boolean };
    // 妥当性のみ判定
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
    amHour: number; // e.g., 9
    pmHour: number; // e.g., 15
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

/**
 * Create a Services container populated with default implementations and a resolved policy.
 *
 * The provided partial `policy` object overrides defaults; unspecified policy fields use:
 * - amHour: 9
 * - pmHour: 15
 * - allowUrlSchemes: ['http', 'https', 'mailto']
 * - tzFallback: null
 * - currencyFallback: null
 *
 * The returned services:
 * - tz: timezone utilities (normalize, coerce with optional fallback, isValid)
 * - iso: ISO datetime formatter (produces zoned ISO strings or null on invalid input)
 * - unicode: shadow/mapping utility (identity implementation)
 * - log: console
 * - file: the optional VFile passed through
 *
 * @param policy - Partial policy values to merge with defaults.
 * @returns A Services object with default implementations and the resolved policy.
 */
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
            const dt = DateTime.fromISO(`${dateISO}T00:00`, { zone }).set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
            if (!dt.isValid) return null;
            return dt.toISO({ suppressMilliseconds: true, suppressSeconds: true, includeOffset: true }) as string;
        },
    };

    const unicode: UnicodeService = {
        // 現状は恒等（安全なセパレータ検出は lex 側の深さ管理で担保する）
        makeShadow: (s: string) => ({ shadow: s, map: (i: number) => i }),
    };

    return { tz, iso, unicode, policy: resolvedPolicy, log: console, file };
}
