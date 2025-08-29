import { describe, expect, it, vi } from 'vitest';
import { buildShareUrlFromContent, clearHash, decodeFromHashBase64, encodeToHashBase64, readHashPayload } from '../src/utils/hash';

describe('hash utils', () => {
    it('encode/decode roundtrip', () => {
        const original = '# タイトル\n本文 with emoji 🚀 and 日本語';
        const base64 = encodeToHashBase64(original);
        const decoded = decodeFromHashBase64(base64);
        expect(decoded).toBe(original);
    });

    it('decodeFromHashBase64 returns null on invalid', () => {
        expect(decodeFromHashBase64('@@invalid@@')).toBeNull();
    });

    it('buildShareUrlFromContent builds url with hash', () => {
        const spy = vi.spyOn(window, 'location', 'get').mockReturnValue({
            origin: 'https://example.com',
            pathname: '/app',
            search: '?a=1',
            hash: '',
        } as unknown as Location);
        const url = buildShareUrlFromContent('hello');
        expect(url.startsWith('https://example.com/app?a=1#')).toBe(true);
        spy.mockRestore();
    });

    it('readHashPayload/clearHash works', () => {
        const replaceSpy = vi.spyOn(history, 'replaceState');
        const getter = vi.spyOn(window, 'location', 'get').mockReturnValue({
            pathname: '/p',
            search: '?q=1',
            hash: '#abc',
        } as unknown as Location);
        expect(readHashPayload()).toBe('abc');
        clearHash();
        expect(replaceSpy).toHaveBeenCalledWith(null, '', '/p?q=1');
        getter.mockRestore();
        replaceSpy.mockRestore();
    });
});
