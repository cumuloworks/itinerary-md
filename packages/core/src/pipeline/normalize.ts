import type { Services } from '../services';
import type { EventTime } from '../types';
import type { ParsedHeader } from './parse';

export type NormalizedHeader = ParsedHeader & { time?: EventTime | null };

export function normalizeHeader(h: ParsedHeader, ctx: { baseTz?: string; dateISO?: string }, sv: Services): NormalizedHeader {
    const baseTz = sv.tz.normalize(ctx.baseTz ?? sv.policy.tzFallback);
    if (!h.time) return { ...h };
    if (!ctx.dateISO) return { ...h };

    const t = h.time;
    if (t.kind === 'none' || t.kind === 'marker') return { ...h };
    if (t.kind === 'point') {
        const startISO = sv.iso.toISO(ctx.dateISO, t.start.hh, t.start.mm, t.start.tz ?? baseTz);
        return { ...h, time: { ...t, startISO } };
    }
    if (t.kind === 'range') {
        const startISO = sv.iso.toISO(ctx.dateISO, t.start.hh, t.start.mm, t.start.tz ?? baseTz);
        let baseDateForEnd = ctx.dateISO;
        const offset = t.end.dayOffset ?? null;
        if (baseDateForEnd && offset && offset > 0) {
            const d = new Date(baseDateForEnd + 'T00:00:00Z');
            d.setUTCDate(d.getUTCDate() + offset);
            baseDateForEnd = d.toISOString().slice(0, 10);
        }
        const endISO = sv.iso.toISO(baseDateForEnd, t.end.hh, t.end.mm, t.end.tz ?? t.start.tz ?? baseTz);
        return { ...h, time: { ...t, startISO, endISO } };
    }
    return { ...h };
}
