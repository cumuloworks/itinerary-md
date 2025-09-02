import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { normalizeHeader } from '../normalize';

describe('normalize: TZ 継承と ISO 生成（簡易）', () => {
    const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });

    it('dateISO + hh:mm 指定なら startISO を生成', () => {
        const out = normalizeHeader({ eventType: 'flight', time: { kind: 'point', start: { hh: 8, mm: 30, tz: null } } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect((out.time as any).startISO?.startsWith('2025-03-15T08:30')).toBe(true);
    });

    it('marker がある場合は ISO は null', () => {
        const out = normalizeHeader({ eventType: 'breakfast', time: { kind: 'marker', marker: 'am' } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect((out.time as any).startISO).toBeUndefined();
    });

    it('end の +1 dayOffset を考慮', () => {
        const out = normalizeHeader({ eventType: 'activity', time: { kind: 'range', start: { hh: 23, mm: 30, tz: null }, end: { hh: 0, mm: 30, tz: null, dayOffset: 1 } } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect((out.time as any).endISO?.startsWith('2025-03-16T00:30')).toBe(true);
    });
});
