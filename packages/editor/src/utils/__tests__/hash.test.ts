import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildShareUrlFromContent, clearHash, decodeFromHashBase64, encodeToHashBase64, readHashPayload } from '../hash';

describe('hash utilities', () => {
    const originalLocation = window.location;
    const originalHistory = window.history;

    beforeEach(() => {
        delete (window as { location?: Location }).location;
        (window as { location?: Location }).location = {
            ...originalLocation,
            hash: '',
        } as Location;

        // Set default values
        Object.defineProperty(window.location, 'origin', {
            value: 'https://example.com',
            writable: true,
            configurable: true,
        });
        Object.defineProperty(window.location, 'pathname', {
            value: '/app',
            writable: true,
            configurable: true,
        });
        Object.defineProperty(window.location, 'search', {
            value: '?param=value',
            writable: true,
            configurable: true,
        });

        window.history.replaceState = vi.fn();
    });

    afterEach(() => {
        (window as { location?: Location }).location = originalLocation;
        window.history.replaceState = originalHistory.replaceState;
    });

    describe('encodeToHashBase64', () => {
        it('compresses a string and encodes to Base64', () => {
            const input = 'Hello, World!';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
            expect(encoded.length).toBeGreaterThan(0);
        });

        it('encodes an empty string', () => {
            const encoded = encodeToHashBase64('');
            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('efficiently encodes a long string with compression', () => {
            const longText = 'a'.repeat(1000);
            const encoded = encodeToHashBase64(longText);

            // Expect the compressed output to be smaller than the original size
            expect(encoded.length).toBeLessThan(longText.length);
        });

        it('encodes a string containing CJK characters', () => {
            const input = 'Japanese text 🎌';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('encodes a string containing special characters', () => {
            const input = '!@#$%^&*()_+{}[]|\\:;"<>?,./~`';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('encodes a multiline string containing newlines', () => {
            const input = 'Line 1\nLine 2\rLine 3\r\nLine 4';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('encodes a JSON string', () => {
            const json = JSON.stringify({
                key: 'value',
                array: [1, 2, 3],
                nested: { prop: true },
            });
            const encoded = encodeToHashBase64(json);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });
    });

    describe('decodeFromHashBase64', () => {
        it('decodes an encoded string correctly', () => {
            const original = 'Hello, World!';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('round-trips an empty string', () => {
            const original = '';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('round-trips a long string', () => {
            const original = 'Lorem ipsum '.repeat(100);
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('round-trips a string containing CJK characters', () => {
            const original = 'Japanese text 🎌 with English';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('returns null for an invalid Base64 string', () => {
            const decoded = decodeFromHashBase64('invalid!@#$');
            expect(decoded).toBeNull();
        });

        it('returns null for invalid compressed payload', () => {
            const invalidBase64 = btoa('not compressed data');
            const decoded = decodeFromHashBase64(invalidBase64);
            expect(decoded).toBeNull();
        });

        it('returns null for empty Base64 input', () => {
            // Raw empty Base64 lacks compression header; decoder returns null
            const decoded = decodeFromHashBase64('');
            expect(decoded).toBeNull();

            // Base64 of a properly compressed empty string is valid and round-trips to ''
            const emptyEncoded = encodeToHashBase64('');
            const validDecoded = decodeFromHashBase64(emptyEncoded);
            expect(validDecoded).toBe('');
        });

        it('returns null for partially corrupted Base64', () => {
            const original = 'Test data';
            const encoded = encodeToHashBase64(original);
            const corrupted = `${encoded.slice(0, -2)}XX`;
            const decoded = decodeFromHashBase64(corrupted);

            expect(decoded).toBeNull();
        });
    });

    describe('readHashPayload', () => {
        it('returns payload without leading # from hash', () => {
            window.location.hash = '#payload';
            expect(readHashPayload()).toBe('payload');
        });

        it('returns null when hash does not start with #', () => {
            // Browsers automatically add '#', so a hash without '#' doesn't occur
            // Mock this for the test
            Object.defineProperty(window.location, 'hash', {
                value: 'payload',
                writable: true,
                configurable: true,
            });
            // If it doesn't start with '#', it becomes empty and then returns null
            expect(readHashPayload()).toBeNull();
        });

        it('returns null for empty hash', () => {
            window.location.hash = '';
            expect(readHashPayload()).toBeNull();
        });

        it('returns null for hash containing only #', () => {
            // With only '#', slicing yields empty string, which is treated as null
            window.location.hash = '#';
            expect(readHashPayload()).toBeNull();
        });

        it('reads an encoded hash payload', () => {
            const encoded = encodeToHashBase64('Test content');
            window.location.hash = `#${encoded}`;
            expect(readHashPayload()).toBe(encoded);
        });

        it('reads a hash containing special characters', () => {
            window.location.hash = '#test%20value%21';
            expect(readHashPayload()).toBe('test%20value%21');
        });
    });

    describe('clearHash', () => {
        it('clears the hash and updates the URL', () => {
            window.location.hash = '#something';
            window.location.pathname = '/app';
            window.location.search = '?param=value';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/app?param=value');
        });

        it('retains path and query parameters', () => {
            window.location.pathname = '/path/to/page';
            window.location.search = '?a=1&b=2';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/path/to/page?a=1&b=2');
        });

        it('handles absence of query parameters', () => {
            window.location.pathname = '/page';
            window.location.search = '';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/page');
        });

        it('handles root path correctly', () => {
            window.location.pathname = '/';
            window.location.search = '';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/');
        });
    });

    describe('buildShareUrlFromContent', () => {
        it('generates a share URL from content', () => {
            Object.defineProperty(window.location, 'origin', {
                value: 'https://example.com',
                writable: true,
                configurable: true,
            });
            Object.defineProperty(window.location, 'pathname', {
                value: '/app',
                writable: true,
                configurable: true,
            });
            Object.defineProperty(window.location, 'search', {
                value: '?lang=ja',
                writable: true,
                configurable: true,
            });

            const content = 'Share this content';
            const url = buildShareUrlFromContent(content);
            const encoded = encodeToHashBase64(content);

            expect(url).toBe(`https://example.com/app?lang=ja#${encoded}`);
        });

        it('generates a URL containing encoded content', () => {
            const content = 'Test content with special characters !@#$%';
            const url = buildShareUrlFromContent(content);

            expect(url).toContain('https://example.com');
            expect(url).toContain('#');

            // Extract hash part and verify it is decodable
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);
            expect(decoded).toBe(content);
        });

        it('generates a URL even for empty content', () => {
            const url = buildShareUrlFromContent('');

            expect(url).toContain('https://example.com');
            expect(url).toContain('#');
        });

        it('compresses and generates a URL for very long content', () => {
            const longContent = 'a'.repeat(10000);
            const url = buildShareUrlFromContent(longContent);

            // Verify URL length is reduced by compression appropriately
            expect(url.length).toBeLessThan(longContent.length + 100);

            // Verify decodability
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);
            expect(decoded).toBe(longContent);
        });

        it('generates a URL from JSON content', () => {
            const jsonContent = JSON.stringify({
                title: 'Itinerary',
                events: ['event1', 'event2'],
                metadata: { version: 1 },
            });

            const url = buildShareUrlFromContent(jsonContent);
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);

            expect(decoded).toBe(jsonContent);
        });

        it('generates a URL from multiline content', () => {
            const multilineContent = `## Title
            
            Paragraph 1
            Paragraph 2
            
            - List item 1
            - List item 2`;

            const url = buildShareUrlFromContent(multilineContent);
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);

            expect(decoded).toBe(multilineContent);
        });
    });

    describe('Integration', () => {
        it('full round-trip flow', () => {
            const originalContent = '## 2024-01-01\n\n[08:00] Event description';

            // Generate URL from content
            const shareUrl = buildShareUrlFromContent(originalContent);

            // Extract hash from URL
            const hashPart = shareUrl.split('#')[1];
            window.location.hash = `#${hashPart}`;

            // Read hash payload
            const payload = readHashPayload();
            expect(payload).toBe(hashPart);

            // Decode and restore the original content
            const decodedContent = decodeFromHashBase64(payload ?? '');
            expect(decodedContent).toBe(originalContent);

            // Clear the hash
            clearHash();
            expect(window.history.replaceState).toHaveBeenCalled();
        });

        it('round-trips for various encodings and languages', () => {
            const testCases = ['ASCII text', 'Japanese text', '中文文本', '한국어 텍스트', 'العربية نص', 'עברית טקסט', 'Emoji 😀🎉🚀', 'Mixed multilingual Text 123'];

            testCases.forEach((original) => {
                const encoded = encodeToHashBase64(original);
                const decoded = decodeFromHashBase64(encoded);
                expect(decoded).toBe(original);
            });
        });
    });
});
