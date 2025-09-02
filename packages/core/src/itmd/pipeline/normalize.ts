import type { Services } from '../services';
import type { ParsedHeader } from './parse';

export type NormalizedHeader = ParsedHeader & {
    time?:
        | (NonNullable<ParsedHeader['time']> & {
              startISO?: string | null;
              endISO?: string | null;
          })
        | null;
};

export function normalizeHeader(h: ParsedHeader, ctx: { baseTz?: string; dateISO?: string }, sv: Services): NormalizedHeader {
    const baseTz = sv.tz.normalize(ctx.baseTz ?? sv.policy.tzFallback);
    const startISO: string | null = ctx.dateISO ? sv.iso.toISO(ctx.dateISO, null, null, baseTz) : null;
    const endISO: string | null = null;
    return {
        ...h,
        time: h.time ? { ...h.time, startISO, endISO } : { startISO, endISO, start: null, end: null, marker: null },
    };
}
