import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { normalizeHeader } from '../normalize';

describe('normalize: time normalization and ISO/TZ', () => {
    it('keeps time undefined when time is not specified', () => {
        const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });
        const out = normalizeHeader({ eventType: 'flight' }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect(out.time).toBeUndefined();
    });

    it('generates startISO for dateISO + hh:mm (considering fallback TZ)', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader(
            {
                eventType: 'flight',
                time: { kind: 'point', start: { hh: 8, mm: 30, tz: null } },
            },
            { baseTz: undefined, dateISO: '2025-03-15' },
            sv
        );
        if (!out.time || out.time.kind !== 'point') throw new Error('time should be point');
        expect(out.time.startISO?.startsWith('2025-03-15T08:30')).toBe(true);
        expect(out.time.startISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{2}:?\d{2}$/);
    });

    it('does not generate ISO when marker is present', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader({ eventType: 'breakfast', time: { kind: 'marker', marker: 'am' } }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        if (!out.time || out.time.kind !== 'marker') throw new Error('time should be marker');
        // For marker, startISO/endISO properties themselves do not exist
        expect('startISO' in out.time).toBe(false);
        expect('endISO' in out.time).toBe(false);
    });

    it('range: generates next-day ISO considering end.dayOffset(+1)', () => {
        const sv = makeDefaultServices({ tzFallback: 'Europe/Madrid' });
        const out = normalizeHeader(
            {
                eventType: 'activity',
                time: {
                    kind: 'range',
                    start: { hh: 23, mm: 30, tz: null },
                    end: { hh: 0, mm: 30, tz: null, dayOffset: 1 },
                },
            },
            { baseTz: undefined, dateISO: '2025-03-15' },
            sv
        );
        if (!out.time || out.time.kind !== 'range') throw new Error('time should be range');
        expect(out.time.startISO?.startsWith('2025-03-15T23:30')).toBe(true);
        expect(out.time.endISO?.startsWith('2025-03-16T00:30')).toBe(true);
    });

    it('accepts UTC/GMT/offset notation as IANA/ZonedName (UTC+09:00)', () => {
        const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });
        const out = normalizeHeader(
            {
                eventType: 'flight',
                time: { kind: 'point', start: { hh: 9, mm: 0, tz: 'UTC+9' } },
            },
            { baseTz: undefined, dateISO: '2025-03-15' },
            sv
        );
        if (!out.time || out.time.kind !== 'point') throw new Error('time should be point');
        expect(out.time.startISO).toMatch(/^2025-03-15T09:00[+-]09:00$/);
    });

    it('accepts @+09:00 inside event and generates ISO', () => {
        const sv = makeDefaultServices({ tzFallback: 'UTC' });
        const out = normalizeHeader(
            {
                eventType: 'train',
                time: { kind: 'point', start: { hh: 8, mm: 0, tz: '+09:00' } },
            },
            { baseTz: undefined, dateISO: '2025-03-15' },
            sv
        );
        if (!out.time || out.time.kind !== 'point') throw new Error('time should be point');
        expect(out.time.startISO).toMatch(/^2025-03-15T08:00\+09:00$/);
    });
});
