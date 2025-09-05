import { describe, expect, it } from 'vitest';
import type { NormalizedHeader } from '../normalize';
import { validateHeader } from '../validate';

describe('validateHeader', () => {
    it('warns when eventType is missing', () => {
        const { warnings } = validateHeader({ eventType: undefined } as unknown as NormalizedHeader, {} as unknown as never);
        expect(warnings.length).toBeGreaterThan(0);
    });

    it('has no warnings when eventType exists', () => {
        const { warnings } = validateHeader({ eventType: 'flight' } as unknown as NormalizedHeader, {} as unknown as never);
        expect(warnings.length).toBe(0);
    });
});
