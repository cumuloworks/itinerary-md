import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { normalizeHeader } from '../normalize';

describe('normalize', () => {
    const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });
    it('時刻未指定なので time は undefined のまま', () => {
        const out = normalizeHeader({ eventType: 'flight' }, { baseTz: undefined, dateISO: '2025-03-15' }, sv);
        expect(out.time).toBeUndefined();
    });
});
