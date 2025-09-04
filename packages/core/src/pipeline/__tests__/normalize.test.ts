import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { normalizeHeader } from '../normalize';

describe('normalize: 時刻正規化と ISO/TZ', () => {
    it('時刻未指定なので time は undefined のまま', () => {
        const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });
        const out = normalizeHeader({ eventType: 'flight' }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect(out.time).toBeUndefined();
    });

    it('dateISO + hh:mm 指定なら startISO を生成（フォールバックTZ考慮）', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader({ eventType: 'flight', time: { kind: 'point', start: { hh: 8, mm: 30, tz: null } } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        if (!out.time || out.time.kind !== 'point') throw new Error('time should be point');
        expect(out.time.startISO?.startsWith('2025-03-15T08:30')).toBe(true);
        expect(out.time.startISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{2}:?\d{2}$/);
    });

    it('marker がある場合は ISO は生成されない', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader({ eventType: 'breakfast', time: { kind: 'marker', marker: 'am' } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        if (!out.time || out.time.kind !== 'marker') throw new Error('time should be marker');
        // marker では startISO/endISO プロパティ自体が存在しない
        expect('startISO' in out.time).toBe(false);
        expect('endISO' in out.time).toBe(false);
    });

    it('range: end の dayOffset(+1) を考慮して翌日 ISO を生成', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader({ eventType: 'activity', time: { kind: 'range', start: { hh: 23, mm: 30, tz: null }, end: { hh: 0, mm: 30, tz: null, dayOffset: 1 } } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        if (!out.time || out.time.kind !== 'range') throw new Error('time should be range');
        expect(out.time.startISO?.startsWith('2025-03-15T23:30')).toBe(true);
        expect(out.time.endISO?.startsWith('2025-03-16T00:30')).toBe(true);
    });
});
