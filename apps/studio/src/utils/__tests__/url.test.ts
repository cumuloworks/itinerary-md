import { describe, expect, it } from 'vitest';
import { buildGoogleMapsSearchUrl, isAllowedHref, isAllowedImageSrc, isExternalHttpUrl } from '../url';

describe('url utilities', () => {
    describe('isAllowedHref', () => {
        it('httpsで始まるURLを許可', () => {
            expect(isAllowedHref('https://example.com')).toBe(true);
            expect(isAllowedHref('https://example.com/path')).toBe(true);
            expect(isAllowedHref('https://sub.example.com')).toBe(true);
            expect(isAllowedHref('https://example.com?query=value')).toBe(true);
            expect(isAllowedHref('https://example.com#anchor')).toBe(true);
        });

        it('相対パスを許可', () => {
            expect(isAllowedHref('/path')).toBe(true);
            expect(isAllowedHref('/path/to/resource')).toBe(true);
            expect(isAllowedHref('/')).toBe(true);
            expect(isAllowedHref('/index.html')).toBe(true);
        });

        it('ハッシュアンカーを許可', () => {
            expect(isAllowedHref('#section')).toBe(true);
            expect(isAllowedHref('#')).toBe(true);
            expect(isAllowedHref('#top')).toBe(true);
        });

        it('httpで始まるURLを拒否', () => {
            expect(isAllowedHref('http://example.com')).toBe(false);
            expect(isAllowedHref('http://localhost')).toBe(false);
        });

        it('その他のプロトコルを拒否', () => {
            expect(isAllowedHref('ftp://example.com')).toBe(false);
            expect(isAllowedHref('javascript:alert(1)')).toBe(false);
            expect(isAllowedHref('data:text/html,<script>alert(1)</script>')).toBe(false);
            expect(isAllowedHref('file:///etc/passwd')).toBe(false);
            expect(isAllowedHref('mailto:test@example.com')).toBe(false);
        });

        it('相対パス風の文字列を拒否', () => {
            expect(isAllowedHref('path')).toBe(false);
            expect(isAllowedHref('./path')).toBe(false);
            expect(isAllowedHref('../path')).toBe(false);
        });

        it('空やnullの値を拒否', () => {
            expect(isAllowedHref('')).toBe(false);
            expect(isAllowedHref(undefined)).toBe(false);
        });

        it('特殊文字を含むURLを処理', () => {
            expect(isAllowedHref('https://example.com/path with spaces')).toBe(true);
            expect(isAllowedHref('/path%20with%20encoding')).toBe(true);
            expect(isAllowedHref('#anchor-with-dash')).toBe(true);
        });

        it('大文字小文字を区別', () => {
            expect(isAllowedHref('HTTPS://example.com')).toBe(false);
            expect(isAllowedHref('Https://example.com')).toBe(false);
        });
    });

    describe('isExternalHttpUrl', () => {
        it('httpで始まるURLを検出', () => {
            expect(isExternalHttpUrl('http://example.com')).toBe(true);
            expect(isExternalHttpUrl('http://localhost')).toBe(true);
            expect(isExternalHttpUrl('http://192.168.1.1')).toBe(true);
        });

        it('httpsで始まるURLを検出', () => {
            expect(isExternalHttpUrl('https://example.com')).toBe(true);
            expect(isExternalHttpUrl('https://api.example.com')).toBe(true);
            expect(isExternalHttpUrl('https://example.com:8080')).toBe(true);
        });

        it('大文字小文字を区別しない', () => {
            expect(isExternalHttpUrl('HTTP://example.com')).toBe(true);
            expect(isExternalHttpUrl('HTTPS://example.com')).toBe(true);
            expect(isExternalHttpUrl('HtTpS://example.com')).toBe(true);
        });

        it('その他のプロトコルを検出しない', () => {
            expect(isExternalHttpUrl('ftp://example.com')).toBe(false);
            expect(isExternalHttpUrl('ws://example.com')).toBe(false);
            expect(isExternalHttpUrl('file:///path')).toBe(false);
        });

        it('相対パスやその他のURLを検出しない', () => {
            expect(isExternalHttpUrl('/path')).toBe(false);
            expect(isExternalHttpUrl('#anchor')).toBe(false);
            expect(isExternalHttpUrl('example.com')).toBe(false);
            expect(isExternalHttpUrl('//example.com')).toBe(false);
        });

        it('空文字列を検出しない', () => {
            expect(isExternalHttpUrl('')).toBe(false);
        });

        it('URLの途中にhttp://を含む場合は検出しない', () => {
            expect(isExternalHttpUrl('text with http://example.com inside')).toBe(false);
            expect(isExternalHttpUrl('not-http://example.com')).toBe(false);
        });

        it('://を含むが先頭でない場合は検出しない', () => {
            expect(isExternalHttpUrl(' http://example.com')).toBe(false);
            expect(isExternalHttpUrl('\thttp://example.com')).toBe(false);
        });
    });

    describe('isAllowedImageSrc', () => {
        it('httpsで始まるURLを許可', () => {
            expect(isAllowedImageSrc('https://example.com/image.jpg')).toBe(true);
            expect(isAllowedImageSrc('https://cdn.example.com/assets/img.png')).toBe(true);
            expect(isAllowedImageSrc('https://example.com/image.svg')).toBe(true);
        });

        it('data URLを許可', () => {
            expect(isAllowedImageSrc('data:image/png;base64,iVBORw0KG...')).toBe(true);
            expect(isAllowedImageSrc('data:image/jpeg;base64,/9j/4AA...')).toBe(true);
            expect(isAllowedImageSrc('data:image/svg+xml;base64,PHN2Zy...')).toBe(true);
            expect(isAllowedImageSrc('data:,')).toBe(true);
        });

        it('相対パスを許可', () => {
            expect(isAllowedImageSrc('/images/logo.png')).toBe(true);
            expect(isAllowedImageSrc('/assets/img/photo.jpg')).toBe(true);
            expect(isAllowedImageSrc('/')).toBe(true);
        });

        it('httpで始まるURLを拒否', () => {
            expect(isAllowedImageSrc('http://example.com/image.jpg')).toBe(false);
            expect(isAllowedImageSrc('http://localhost/img.png')).toBe(false);
        });

        it('その他のプロトコルを拒否', () => {
            expect(isAllowedImageSrc('file:///image.jpg')).toBe(false);
            expect(isAllowedImageSrc('javascript:alert(1)')).toBe(false);
            expect(isAllowedImageSrc('ftp://example.com/image.jpg')).toBe(false);
        });

        it('相対パス風の文字列を拒否', () => {
            expect(isAllowedImageSrc('image.jpg')).toBe(false);
            expect(isAllowedImageSrc('./image.jpg')).toBe(false);
            expect(isAllowedImageSrc('../images/photo.png')).toBe(false);
        });

        it('空やnullの値を拒否', () => {
            expect(isAllowedImageSrc('')).toBe(false);
            expect(isAllowedImageSrc(undefined)).toBe(false);
        });

        it('特殊なdata URLフォーマットを処理', () => {
            expect(isAllowedImageSrc('data:text/plain;charset=utf-8,Hello')).toBe(true);
            expect(isAllowedImageSrc('data:;base64,SGVsbG8=')).toBe(true);
        });

        it('大文字小文字を区別', () => {
            expect(isAllowedImageSrc('HTTPS://example.com/image.jpg')).toBe(false);
            expect(isAllowedImageSrc('DATA:image/png;base64,abc')).toBe(false);
        });
    });

    describe('buildGoogleMapsSearchUrl', () => {
        it('場所名からGoogle Maps検索URLを生成', () => {
            const url = buildGoogleMapsSearchUrl('Tokyo Station');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Tokyo%20Station');
        });

        it('日本語の場所名をエンコード', () => {
            const url = buildGoogleMapsSearchUrl('東京駅');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E4%BA%AC%E9%A7%85');
        });

        it('特殊文字を含む場所名をエンコード', () => {
            const url = buildGoogleMapsSearchUrl('Cafe & Bar @ Station');
            expect(url).toContain('Cafe%20%26%20Bar%20%40%20Station');
        });

        it('空文字列を処理', () => {
            const url = buildGoogleMapsSearchUrl('');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=');
        });

        it('スペースを正しくエンコード', () => {
            const url = buildGoogleMapsSearchUrl('New York City');
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=New%20York%20City');
        });

        it('カンマを含む住所をエンコード', () => {
            const url = buildGoogleMapsSearchUrl('1-1-1 Marunouchi, Chiyoda-ku, Tokyo');
            expect(url).toContain('1-1-1%20Marunouchi%2C%20Chiyoda-ku%2C%20Tokyo');
        });

        it('座標を含む文字列を処理', () => {
            const url = buildGoogleMapsSearchUrl('35.681236,139.767125');
            expect(url).toContain('35.681236%2C139.767125');
        });

        it('改行を含む文字列を処理', () => {
            const url = buildGoogleMapsSearchUrl('Line 1\nLine 2');
            expect(url).toContain('Line%201%0ALine%202');
        });

        it('URLエンコーディングが必要な全ての文字を処理', () => {
            const specialChars = '!@#$%^&*()+=[]{}|\\:;"<>?,./~`';
            const url = buildGoogleMapsSearchUrl(specialChars);

            // URLが正しく生成されていることを確認
            expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
            expect(url.length).toBeGreaterThan('https://www.google.com/maps/search/?api=1&query='.length);

            // デコードして元の文字列に戻ることを確認
            const encodedPart = url.replace('https://www.google.com/maps/search/?api=1&query=', '');
            expect(decodeURIComponent(encodedPart)).toBe(specialChars);
        });

        it('絵文字を含む場所名を処理', () => {
            const url = buildGoogleMapsSearchUrl('🗼 Tokyo Tower');
            expect(url).toContain('Tokyo%20Tower');
            expect(url).toContain('%F0%9F%97%BC'); // 🗼のURLエンコード
        });

        it('非常に長い場所名を処理', () => {
            const longName = `${'Very '.repeat(100)}Long Place Name`;
            const url = buildGoogleMapsSearchUrl(longName);

            expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
            expect(url).toContain('Very');
            expect(url).toContain('Long%20Place%20Name');
        });
    });
});
