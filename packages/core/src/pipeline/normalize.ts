import type { Services } from '../services/index.js';
import type { EventTime } from '../types.js';
import type { ParsedHeader } from './parse.js';

export type NormalizedHeader = ParsedHeader & { time?: EventTime | null };

export function normalizeHeader(h: ParsedHeader, ctx: { baseTz?: string; dateISO?: string }, sv: Services): NormalizedHeader {
    const baseCoerced = sv.tz.coerce(ctx.baseTz ?? null, sv.policy.tzFallback ?? null);
    const baseTz = baseCoerced.tz;
    if (!h.time) return { ...h };
    if (!ctx.dateISO) return { ...h };

    const t = h.time;
    if (t.kind === 'none' || t.kind === 'marker') return { ...h };
    if (t.kind === 'point') {
        const startTz = sv.tz.coerce(t.start.tz ?? null, baseTz ?? null).tz ?? null;
        const startISO = sv.iso.toISO(ctx.dateISO, t.start.hh, t.start.mm, startTz);
        return { ...h, time: { ...t, startISO } };
    }
    if (t.kind === 'range') {
        const startTz = sv.tz.coerce(t.start.tz ?? null, baseTz ?? null).tz ?? null;
        const startISO = sv.iso.toISO(ctx.dateISO, t.start.hh, t.start.mm, startTz);
        let baseDateForEnd = ctx.dateISO;
        const offset = t.end.dayOffset ?? null;
        if (baseDateForEnd && offset && offset > 0) {
            const d = new Date(`${baseDateForEnd}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() + offset);
            baseDateForEnd = d.toISOString().slice(0, 10);
        }
        const endBase = t.start.tz ?? baseTz ?? null;
        const endTz = sv.tz.coerce(t.end.tz ?? null, endBase).tz ?? null;
        const endISO = sv.iso.toISO(baseDateForEnd, t.end.hh, t.end.mm, endTz);
        return { ...h, time: { ...t, startISO, endISO } };
    }
    return { ...h };
}
