import { describe, expect, it } from 'vitest';
import type { NormalizedHeader } from '../normalize';
import { validateHeader } from '../validate';

describe('validateHeader', () => {
    it('eventType が無いと warning', () => {
        const { warnings } = validateHeader({ eventType: undefined } as unknown as NormalizedHeader, {} as unknown as never);
        expect(warnings.length).toBeGreaterThan(0);
    });

    it('eventType がある場合は warning なし', () => {
        const { warnings } = validateHeader({ eventType: 'flight' } as unknown as NormalizedHeader, {} as unknown as never);
        expect(warnings.length).toBe(0);
    });
});
