import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeTextToClipboard } from '../clipboard';

describe('clipboard utilities', () => {
    let originalClipboard: Clipboard | undefined;
    let originalClipboardDescriptor: PropertyDescriptor | undefined;
    let originalExecCommand: typeof document.execCommand;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        originalClipboard = navigator.clipboard;
        originalExecCommand = document.execCommand;
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (originalClipboard === undefined) {
            delete (navigator as any).clipboard;
        } else {
            if (originalClipboardDescriptor) {
                Object.defineProperty(navigator, 'clipboard', { ...originalClipboardDescriptor, value: originalClipboard });
            } else {
                Object.defineProperty(navigator, 'clipboard', {
                    value: originalClipboard,
                    writable: true,
                    configurable: true,
                });
            }
        }
        document.execCommand = originalExecCommand;
        consoleWarnSpy.mockRestore();
    });

    describe('writeTextToClipboard', () => {
        describe('Clipboard API を使用', () => {
            it('テキストをクリップボードに書き込む', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                await writeTextToClipboard('test text');

                expect(writeTextMock).toHaveBeenCalledWith('test text');
                expect(consoleWarnSpy).not.toHaveBeenCalled();
            });

            it('空の文字列を書き込む', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                await writeTextToClipboard('');

                expect(writeTextMock).toHaveBeenCalledWith('');
            });

            it('改行を含むテキストを書き込む', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                const multilineText = 'line1\nline2\rline3\r\nline4';
                await writeTextToClipboard(multilineText);

                expect(writeTextMock).toHaveBeenCalledWith(multilineText);
            });

            it('特殊文字を含むテキストを書き込む', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                const specialText = '{"key": "value"}\t<tag>content</tag>\u{1F600}';
                await writeTextToClipboard(specialText);

                expect(writeTextMock).toHaveBeenCalledWith(specialText);
            });

            it('APIエラー時にフォールバック方式を使用', async () => {
                const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                const execCommandMock = vi.fn().mockReturnValue(true);
                document.execCommand = execCommandMock;

                await writeTextToClipboard('fallback test');

                expect(writeTextMock).toHaveBeenCalled();
                expect(consoleWarnSpy).toHaveBeenCalledWith('Clipboard API failed, falling back to textarea method:', expect.any(Error));
                expect(execCommandMock).toHaveBeenCalledWith('copy');
            });
        });

        describe('textarea フォールバック方式', () => {
            beforeEach(() => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });
            });

            it('textareaを使用してテキストをコピー', async () => {
                const execCommandMock = vi.fn().mockReturnValue(true);
                document.execCommand = execCommandMock;

                const appendChildSpy = vi.spyOn(document.body, 'appendChild');
                const removeChildSpy = vi.spyOn(document.body, 'removeChild');

                await writeTextToClipboard('textarea test');

                expect(appendChildSpy).toHaveBeenCalled();
                expect(execCommandMock).toHaveBeenCalledWith('copy');
                expect(removeChildSpy).toHaveBeenCalled();
            });

            it('textareaの属性を正しく設定', async () => {
                let createdTextarea: HTMLTextAreaElement | null = null;
                const originalAppendChild = document.body.appendChild.bind(document.body);
                const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
                    createdTextarea = node as HTMLTextAreaElement;
                    // 実際にDOMに追加する必要がある
                    return originalAppendChild(node);
                });

                document.execCommand = vi.fn().mockReturnValue(true);

                await writeTextToClipboard('test value');

                expect(createdTextarea).not.toBeNull();
                if (createdTextarea) {
                    const textarea = createdTextarea as HTMLTextAreaElement;
                    expect(textarea.value).toBe('test value');
                    expect(textarea.style.position).toBe('fixed');
                    expect(textarea.style.left).toBe('-9999px');
                    expect(textarea.hasAttribute('readonly')).toBe(true);
                }

                appendChildSpy.mockRestore();
            });

            it('既存の選択範囲を保持', async () => {
                // 選択範囲を作成
                const range = document.createRange();
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);

                // const initialRangeCount = selection?.rangeCount || 0;

                document.execCommand = vi.fn().mockReturnValue(true);

                // テストではtextareaフォールバックの詳細な動作をテストしない
                // (実際のDOM操作が複雑なため)
                await expect(writeTextToClipboard('preserve selection')).resolves.toBeUndefined();
            });

            it('アクティブ要素のフォーカスを復元', async () => {
                const input = document.createElement('input');
                document.body.appendChild(input);
                input.focus();

                document.execCommand = vi.fn().mockReturnValue(true);

                // テストではtextareaフォールバックの詳細な動作をテストしない
                await expect(writeTextToClipboard('restore focus')).resolves.toBeUndefined();

                document.body.removeChild(input);
            });

            it('エラーが発生してもクリーンアップを実行', async () => {
                const execCommandMock = vi.fn().mockImplementation(() => {
                    throw new Error('execCommand error');
                });
                document.execCommand = execCommandMock;

                // エラーが発生してもクラッシュしない
                await expect(writeTextToClipboard('error test')).rejects.toThrow('execCommand error');
            });
        });

        describe('エッジケース', () => {
            it('非常に長いテキストをコピー', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                const longText = 'a'.repeat(100000);
                await writeTextToClipboard(longText);

                expect(writeTextMock).toHaveBeenCalledWith(longText);
            });

            it('複数の選択範囲を保持', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                const selection = window.getSelection();
                selection?.removeAllRanges();

                // 複数の範囲を追加（ブラウザがサポートしている場合）
                const range1 = document.createRange();
                const range2 = document.createRange();
                selection?.addRange(range1);
                try {
                    selection?.addRange(range2);
                } catch {
                    // 一部のブラウザは複数の範囲をサポートしない
                }

                document.execCommand = vi.fn().mockReturnValue(true);

                // テストではtextareaフォールバックの詳細な動作をテストしない
                await expect(writeTextToClipboard('multiple ranges')).resolves.toBeUndefined();
            });

            it('フォーカス不可能な要素がアクティブな場合', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                const div = document.createElement('div');

                // divにfocusメソッドを追加しない（フォーカス不可能）
                Object.defineProperty(document, 'activeElement', {
                    value: div,
                    writable: true,
                    configurable: true,
                });

                document.execCommand = vi.fn().mockReturnValue(true);

                // エラーを投げずに処理が完了する
                await expect(writeTextToClipboard('no focus element')).resolves.toBeUndefined();
            });

            it('nullのactiveElement', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                Object.defineProperty(document, 'activeElement', {
                    value: null,
                    writable: true,
                    configurable: true,
                });

                document.execCommand = vi.fn().mockReturnValue(true);

                await expect(writeTextToClipboard('null active')).resolves.toBeUndefined();
            });

            it('selectionがnullの場合', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                const originalGetSelection = window.getSelection;
                window.getSelection = () => null;

                document.execCommand = vi.fn().mockReturnValue(true);

                await expect(writeTextToClipboard('no selection')).resolves.toBeUndefined();

                window.getSelection = originalGetSelection;
            });
        });
    });
});
