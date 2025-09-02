import { DateTime } from 'luxon';
import type { VFile } from 'vfile';

export interface TzService {
    normalize(tz?: string | null): string | null;
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
    };

    const tz: TzService = {
        normalize: (tz) => (tz && typeof tz === 'string' ? tz : null),
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
        makeShadow: (s: string) => ({ shadow: s, map: (i: number) => i }),
    };

    return { tz, iso, unicode, policy: resolvedPolicy, log: console, file };
}
