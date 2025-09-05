import type { VFile } from 'vfile';
export interface TzService {
    normalize(tz?: string | null): string | null;
    coerce(
        tz?: string | null,
        fallback?: string | null
    ): {
        tz: string | null;
        valid: boolean;
    };
    isValid(tz?: string | null): boolean;
}
export interface IsoService {
    toISO(dateISO: string | undefined, hh: number | null, mm: number | null, tz: string | null): string | null;
}
export interface UnicodeService {
    makeShadow(s: string): {
        shadow: string;
        map: (shadowIdx: number) => number;
    };
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
export declare function makeDefaultServices(policy?: Partial<Policy>, file?: VFile): Services;
