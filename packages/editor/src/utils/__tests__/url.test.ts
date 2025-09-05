import { describe, expect, it } from 'vitest';
import { buildGoogleMapsSearchUrl, isAllowedHref, isAllowedImageSrc, isExternalHttpUrl } from '../url';

describe('url utilities', () => {
    describe('isAllowedHref', () => {
        it('allow URLs starting with https', () => {
            expect(isAllowedHref('https://example.com')).toBe(true);
            expect(isAllowedHref('https://example.com/path')).toBe(true);
            expect(isAllowedHref('https://sub.example.com')).toBe(true);
            expect(isAllowedHref('https://example.com?query=value')).toBe(true);
            expect(isAllowedHref('https://example.com#anchor')).toBe(true);
        });

        it('allow relative paths', () => {
            expect(isAllowedHref('/path')).toBe(true);
            expect(isAllowedHref('/path/to/resource')).toBe(true);
            expect(isAllowedHref('/')).toBe(true);
            expect(isAllowedHref('/index.html')).toBe(true);
        });

        it('allow hash anchors', () => {
            expect(isAllowedHref('#section')).toBe(true);
            expect(isAllowedHref('#')).toBe(true);
            expect(isAllowedHref('#top')).toBe(true);
        });

        it('reject URLs starting with http', () => {
            expect(isAllowedHref('http://example.com')).toBe(false);
            expect(isAllowedHref('http://localhost')).toBe(false);
        });

        it('reject other protocols', () => {
            expect(isAllowedHref('ftp://example.com')).toBe(false);
            expect(isAllowedHref('javascript:alert(1)')).toBe(false);
            expect(isAllowedHref('data:text/html,<script>alert(1)</script>')).toBe(false);
            expect(isAllowedHref('file:///etc/passwd')).toBe(false);
            expect(isAllowedHref('mailto:test@example.com')).toBe(false);
        });

        it('reject path-like strings', () => {
            expect(isAllowedHref('path')).toBe(false);
            expect(isAllowedHref('./path')).toBe(false);
            expect(isAllowedHref('../path')).toBe(false);
        });

        it('reject empty or null values', () => {
            expect(isAllowedHref('')).toBe(false);
            expect(isAllowedHref(undefined)).toBe(false);
        });

        it('handle URLs with special characters', () => {
            expect(isAllowedHref('https://example.com/path with spaces')).toBe(true);
            expect(isAllowedHref('/path%20with%20encoding')).toBe(true);
            expect(isAllowedHref('#anchor-with-dash')).toBe(true);
        });

        it('be case sensitive', () => {
            expect(isAllowedHref('HTTPS://example.com')).toBe(false);
            expect(isAllowedHref('Https://example.com')).toBe(false);
        });
    });

    describe('isExternalHttpUrl', () => {
        it('detect URLs starting with http', () => {
            expect(isExternalHttpUrl('http://example.com')).toBe(true);
            expect(isExternalHttpUrl('http://localhost')).toBe(true);
            expect(isExternalHttpUrl('http://192.168.1.1')).toBe(true);
        });

        it('detect URLs starting with https', () => {
            expect(isExternalHttpUrl('https://example.com')).toBe(true);
            expect(isExternalHttpUrl('https://api.example.com')).toBe(true);
            expect(isExternalHttpUrl('https://example.com:8080')).toBe(true);
        });

        it('be case insensitive', () => {
            expect(isExternalHttpUrl('HTTP://example.com')).toBe(true);
            expect(isExternalHttpUrl('HTTPS://example.com')).toBe(true);
            expect(isExternalHttpUrl('HtTpS://example.com')).toBe(true);
        });

        it('not detect other protocols', () => {
            expect(isExternalHttpUrl('ftp://example.com')).toBe(false);
            expect(isExternalHttpUrl('ws://example.com')).toBe(false);
            expect(isExternalHttpUrl('file:///path')).toBe(false);
        });

        it('not detect relative paths or other URLs', () => {
            expect(isExternalHttpUrl('/path')).toBe(false);
            expect(isExternalHttpUrl('#anchor')).toBe(false);
            expect(isExternalHttpUrl('example.com')).toBe(false);
            expect(isExternalHttpUrl('//example.com')).toBe(false);
        });

        it('not detect empty strings', () => {
            expect(isExternalHttpUrl('')).toBe(false);
        });

        it('not detect when http:// appears in the middle', () => {
            expect(isExternalHttpUrl('text with http://example.com inside')).toBe(false);
            expect(isExternalHttpUrl('not-http://example.com')).toBe(false);
        });

        it('not detect when :// is not at the start', () => {
            expect(isExternalHttpUrl(' http://example.com')).toBe(false);
            expect(isExternalHttpUrl('\thttp://example.com')).toBe(false);
        });
    });

    describe('isAllowedImageSrc', () => {
        it('allow URLs starting with https', () => {
            expect(isAllowedImageSrc('https://example.com/image.jpg')).toBe(true);
            expect(isAllowedImageSrc('https://cdn.example.com/assets/img.png')).toBe(true);
            expect(isAllowedImageSrc('https://example.com/image.svg')).toBe(true);
        });

        it('allow data URLs', () => {
            expect(isAllowedImageSrc('data:image/png;base64,iVBORw0KG...')).toBe(true);
            expect(isAllowedImageSrc('data:image/jpeg;base64,/9j/4AA...')).toBe(true);
            expect(isAllowedImageSrc('data:image/svg+xml;base64,PHN2Zy...')).toBe(true);
            expect(isAllowedImageSrc('data:,')).toBe(true);
        });

        it('allow relative paths', () => {
            expect(isAllowedImageSrc('/images/logo.png')).toBe(true);
            expect(isAllowedImageSrc('/assets/img/photo.jpg')).toBe(true);
            expect(isAllowedImageSrc('/')).toBe(true);
        });

        it('reject URLs starting with http', () => {
            expect(isAllowedImageSrc('http://example.com/image.jpg')).toBe(false);
            expect(isAllowedImageSrc('http://localhost/img.png')).toBe(false);
        });

        it('reject other protocols', () => {
            expect(isAllowedImageSrc('file:///image.jpg')).toBe(false);
            expect(isAllowedImageSrc('javascript:alert(1)')).toBe(false);
            expect(isAllowedImageSrc('ftp://example.com/image.jpg')).toBe(false);
        });

        it('reject path-like strings', () => {
            expect(isAllowedImageSrc('image.jpg')).toBe(false);
            expect(isAllowedImageSrc('./image.jpg')).toBe(false);
            expect(isAllowedImageSrc('../images/photo.png')).toBe(false);
        });

        it('reject empty or null values', () => {
            expect(isAllowedImageSrc('')).toBe(false);
            expect(isAllowedImageSrc(undefined)).toBe(false);
        });

        it('handle special data URL formats', () => {
            expect(isAllowedImageSrc('data:text/plain;charset=utf-8,Hello')).toBe(true);
            expect(isAllowedImageSrc('data:;base64,SGVsbG8=')).toBe(true);
        });

        it('be case sensitive', () => {
            expect(isAllowedImageSrc('HTTPS://example.com/image.jpg')).toBe(false);
            expect(isAllowedImageSrc('DATA:image/png;base64,abc')).toBe(false);
        });
    });

    describe('buildGoogleMapsSearchUrl', () => {
        it('build Google Maps search URL from a place name', () => {
            const url = buildGoogleMapsSearchUrl('Tokyo Station');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Tokyo%20Station');
        });

        it('encode Japanese place names', () => {
            const url = buildGoogleMapsSearchUrl('東京駅');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E4%BA%AC%E9%A7%85');
        });

        it('encode place names with special characters', () => {
            const url = buildGoogleMapsSearchUrl('Cafe & Bar @ Station');
            expect(url).toContain('Cafe%20%26%20Bar%20%40%20Station');
        });

        it('handle empty strings', () => {
            const url = buildGoogleMapsSearchUrl('');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=');
        });

        it('encode spaces correctly', () => {
            const url = buildGoogleMapsSearchUrl('New York City');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=New%20York%20City');
        });

        it('encode addresses containing commas', () => {
            const url = buildGoogleMapsSearchUrl('1-1-1 Marunouchi, Chiyoda-ku, Tokyo');
            expect(url).toContain('1-1-1%20Marunouchi%2C%20Chiyoda-ku%2C%20Tokyo');
        });

        it('handle strings containing coordinates', () => {
            const url = buildGoogleMapsSearchUrl('35.681236,139.767125');
            expect(url).toContain('35.681236%2C139.767125');
        });

        it('handle strings with newlines', () => {
            const url = buildGoogleMapsSearchUrl('Line 1\nLine 2');
            expect(url).toContain('Line%201%0ALine%202');
        });

        it('handle all characters requiring URL encoding', () => {
            const specialChars = '!@#$%^&*()+=[]{}|\\:;"<>?,./~`';
            const url = buildGoogleMapsSearchUrl(specialChars);

            // Verify URL is generated correctly
            expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
            expect(url.length).toBeGreaterThan('https://www.google.com/maps/search/?api=1&query='.length);

            // Verify decoding returns the original string
            const encodedPart = url.replace('https://www.google.com/maps/search/?api=1&query=', '');
            expect(decodeURIComponent(encodedPart)).toBe(specialChars);
        });

        it('handle place names with emoji', () => {
            const url = buildGoogleMapsSearchUrl('🗼 Tokyo Tower');
            expect(url).toContain('Tokyo%20Tower');
            expect(url).toContain('%F0%9F%97%BC'); // 🗼のURLエンコード
        });

        it('handle very long place names', () => {
            const longName = `${'Very '.repeat(100)}Long Place Name`;
            const url = buildGoogleMapsSearchUrl(longName);

            expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
            expect(url).toContain('Very');
            expect(url).toContain('Long%20Place%20Name');
        });
    });
});
