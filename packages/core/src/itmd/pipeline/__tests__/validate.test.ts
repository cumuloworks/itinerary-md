import { describe, expect, it } from 'vitest';
import { validateHeader } from '../validate';

describe('validateHeader', () => {
    it('eventType が無いと warning', () => {
        const { warnings } = validateHeader({ eventType: undefined }, {} as any);
        expect(warnings.length).toBeGreaterThan(0);
    });
});
