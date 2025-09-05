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

        // デフォルト値を設定
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
        it('文字列を圧縮してBase64エンコード', () => {
            const input = 'Hello, World!';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
            expect(encoded.length).toBeGreaterThan(0);
        });

        it('空の文字列をエンコード', () => {
            const encoded = encodeToHashBase64('');
            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('長い文字列を圧縮効率よくエンコード', () => {
            const longText = 'a'.repeat(1000);
            const encoded = encodeToHashBase64(longText);

            // 圧縮により元のサイズより小さくなることを期待
            expect(encoded.length).toBeLessThan(longText.length);
        });

        it('日本語を含む文字列をエンコード', () => {
            const input = '日本語のテキスト🎌';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('特殊文字を含む文字列をエンコード', () => {
            const input = '!@#$%^&*()_+{}[]|\\:;"<>?,./~`';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('改行を含むマルチライン文字列をエンコード', () => {
            const input = 'Line 1\nLine 2\rLine 3\r\nLine 4';
            const encoded = encodeToHashBase64(input);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });

        it('JSON文字列をエンコード', () => {
            const json = JSON.stringify({ key: 'value', array: [1, 2, 3], nested: { prop: true } });
            const encoded = encodeToHashBase64(json);

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
        });
    });

    describe('decodeFromHashBase64', () => {
        it('エンコードされた文字列を正しくデコード', () => {
            const original = 'Hello, World!';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('空の文字列を往復変換', () => {
            const original = '';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('長い文字列を往復変換', () => {
            const original = 'Lorem ipsum '.repeat(100);
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('日本語を含む文字列を往復変換', () => {
            const original = '日本語のテキスト🎌 with English';
            const encoded = encodeToHashBase64(original);
            const decoded = decodeFromHashBase64(encoded);

            expect(decoded).toBe(original);
        });

        it('無効なBase64文字列でnullを返す', () => {
            const decoded = decodeFromHashBase64('invalid!@#$');
            expect(decoded).toBeNull();
        });

        it('不正な圧縮データでnullを返す', () => {
            const invalidBase64 = btoa('not compressed data');
            const decoded = decodeFromHashBase64(invalidBase64);
            expect(decoded).toBeNull();
        });

        it('空のBase64文字列は空文字列を返す', () => {
            // atob('')は空文字列を返すため、結果的に空文字列が返される
            const decoded = decodeFromHashBase64('');
            expect(decoded).toBe('');

            // 空の文字列を正しく圧縮したBase64も有効
            const emptyEncoded = encodeToHashBase64('');
            const validDecoded = decodeFromHashBase64(emptyEncoded);
            expect(validDecoded).toBe('');
        });

        it('部分的に破損したBase64でnullを返す', () => {
            const original = 'Test data';
            const encoded = encodeToHashBase64(original);
            const corrupted = `${encoded.slice(0, -2)}XX`;
            const decoded = decodeFromHashBase64(corrupted);

            expect(decoded).toBeNull();
        });
    });

    describe('readHashPayload', () => {
        it('ハッシュから#を除いたペイロードを返す', () => {
            window.location.hash = '#payload';
            expect(readHashPayload()).toBe('payload');
        });

        it('#で始まらないハッシュはnullを返す', () => {
            // ブラウザは自動的に#を付けるため、#なしのハッシュは実際には発生しない
            // テストのためにモックする
            Object.defineProperty(window.location, 'hash', {
                value: 'payload',
                writable: true,
                configurable: true,
            });
            // #で始まらない場合は空文字列になり、その後nullが返る
            expect(readHashPayload()).toBeNull();
        });

        it('空のハッシュでnullを返す', () => {
            window.location.hash = '';
            expect(readHashPayload()).toBeNull();
        });

        it('#のみのハッシュでnullを返す', () => {
            // #のみの場合、sliceすると空文字列になり、空文字列はnullとして扱われる
            window.location.hash = '#';
            expect(readHashPayload()).toBeNull();
        });

        it('エンコードされたハッシュペイロードを読み取る', () => {
            const encoded = encodeToHashBase64('Test content');
            window.location.hash = `#${encoded}`;
            expect(readHashPayload()).toBe(encoded);
        });

        it('特殊文字を含むハッシュを読み取る', () => {
            window.location.hash = '#test%20value%21';
            expect(readHashPayload()).toBe('test%20value%21');
        });
    });

    describe('clearHash', () => {
        it('ハッシュをクリアしてURLを更新', () => {
            window.location.hash = '#something';
            window.location.pathname = '/app';
            window.location.search = '?param=value';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/app?param=value');
        });

        it('パスとクエリパラメータを保持', () => {
            window.location.pathname = '/path/to/page';
            window.location.search = '?a=1&b=2';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/path/to/page?a=1&b=2');
        });

        it('クエリパラメータがない場合も正しく処理', () => {
            window.location.pathname = '/page';
            window.location.search = '';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/page');
        });

        it('ルートパスでも正しく処理', () => {
            window.location.pathname = '/';
            window.location.search = '';

            clearHash();

            expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/');
        });
    });

    describe('buildShareUrlFromContent', () => {
        it('コンテンツからシェアURLを生成', () => {
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

        it('エンコードされたコンテンツを含むURLを生成', () => {
            const content = 'Test content with 特殊文字!@#$%';
            const url = buildShareUrlFromContent(content);

            expect(url).toContain('https://example.com');
            expect(url).toContain('#');

            // ハッシュ部分を取得してデコード可能か確認
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);
            expect(decoded).toBe(content);
        });

        it('空のコンテンツでもURLを生成', () => {
            const url = buildShareUrlFromContent('');

            expect(url).toContain('https://example.com');
            expect(url).toContain('#');
        });

        it('非常に長いコンテンツを圧縮してURLを生成', () => {
            const longContent = 'a'.repeat(10000);
            const url = buildShareUrlFromContent(longContent);

            // URLの長さが適切に圧縮されているか
            expect(url.length).toBeLessThan(longContent.length + 100);

            // デコード可能か確認
            const hashPart = url.split('#')[1];
            const decoded = decodeFromHashBase64(hashPart);
            expect(decoded).toBe(longContent);
        });

        it('JSONコンテンツからURLを生成', () => {
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

        it('マルチラインコンテンツからURLを生成', () => {
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

    describe('統合テスト', () => {
        it('完全な往復変換フロー', () => {
            const originalContent = '## 2024-01-01\n\n[08:00] Event description';

            // コンテンツからURLを生成
            const shareUrl = buildShareUrlFromContent(originalContent);

            // URLからハッシュを抽出
            const hashPart = shareUrl.split('#')[1];
            window.location.hash = `#${hashPart}`;

            // ハッシュペイロードを読み取り
            const payload = readHashPayload();
            expect(payload).toBe(hashPart);

            // デコードして元のコンテンツを復元
            const decodedContent = decodeFromHashBase64(payload!);
            expect(decodedContent).toBe(originalContent);

            // ハッシュをクリア
            clearHash();
            expect(window.history.replaceState).toHaveBeenCalled();
        });

        it('様々な文字エンコーディングでの往復変換', () => {
            const testCases = ['ASCII text', '日本語テキスト', '中文文本', '한국어 텍스트', 'العربية نص', 'עברית טקסט', 'Emoji 😀🎉🚀', 'Mixed 混合 Text テキスト 123'];

            testCases.forEach((original) => {
                const encoded = encodeToHashBase64(original);
                const decoded = decodeFromHashBase64(encoded);
                expect(decoded).toBe(original);
            });
        });
    });
});
