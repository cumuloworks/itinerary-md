import { describe, expect, it, vi } from 'vitest';
import { makeDefaultServices } from '../index';

describe('policy deprecations mapping', () => {
    it('maps legacy tzFallback to defaultTimezone with warning', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' } as any);
        expect(sv.policy.defaultTimezone).toBe('Asia/Tokyo');
        expect(spy).toHaveBeenCalled();
        const msgs = spy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(msgs).toMatch(/0\.2\.0/);
        spy.mockRestore();
    });

    it('maps legacy currencyFallback to defaultCurrency with warning', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const sv = makeDefaultServices({ currencyFallback: 'JPY' } as any);
        expect(sv.policy.defaultCurrency).toBe('JPY');
        expect(spy).toHaveBeenCalled();
        const msgs = spy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(msgs).toMatch(/0\.2\.0/);
        spy.mockRestore();
    });
});
