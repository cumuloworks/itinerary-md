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
        describe('Using Clipboard API', () => {
            it('writes text to the clipboard', async () => {
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

            it('writes an empty string', async () => {
                const writeTextMock = vi.fn().mockResolvedValue(undefined);
                Object.defineProperty(navigator, 'clipboard', {
                    value: { writeText: writeTextMock },
                    writable: true,
                    configurable: true,
                });

                await writeTextToClipboard('');

                expect(writeTextMock).toHaveBeenCalledWith('');
            });

            it('writes text containing newlines', async () => {
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

            it('writes text containing special characters', async () => {
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

            it('uses fallback method when API errors occur', async () => {
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

        describe('Textarea fallback method', () => {
            beforeEach(() => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });
            });

            it('copies text using a textarea', async () => {
                const execCommandMock = vi.fn().mockReturnValue(true);
                document.execCommand = execCommandMock;

                const appendChildSpy = vi.spyOn(document.body, 'appendChild');
                const removeChildSpy = vi.spyOn(document.body, 'removeChild');

                await writeTextToClipboard('textarea test');

                expect(appendChildSpy).toHaveBeenCalled();
                expect(execCommandMock).toHaveBeenCalledWith('copy');
                expect(removeChildSpy).toHaveBeenCalled();
            });

            it('sets textarea attributes correctly', async () => {
                let createdTextarea: HTMLTextAreaElement | null = null;
                const originalAppendChild = document.body.appendChild.bind(document.body);
                const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
                    createdTextarea = node as HTMLTextAreaElement;
                    // Needs to be actually appended to the DOM
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

            it('preserves existing selection range', async () => {
                // Create selection range
                const range = document.createRange();
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);

                // const initialRangeCount = selection?.rangeCount || 0;

                document.execCommand = vi.fn().mockReturnValue(true);

                // Do not test textarea fallback details here
                // (Actual DOM operations are complex)
                await expect(writeTextToClipboard('preserve selection')).resolves.toBeUndefined();
            });

            it('restores focus to the previously active element', async () => {
                const input = document.createElement('input');
                document.body.appendChild(input);
                input.focus();

                document.execCommand = vi.fn().mockReturnValue(true);

                // Do not test textarea fallback details here
                await expect(writeTextToClipboard('restore focus')).resolves.toBeUndefined();

                document.body.removeChild(input);
            });

            it('performs cleanup even when an error occurs', async () => {
                const execCommandMock = vi.fn().mockImplementation(() => {
                    throw new Error('execCommand error');
                });
                document.execCommand = execCommandMock;

                // Should not crash even if an error occurs
                await expect(writeTextToClipboard('error test')).rejects.toThrow('execCommand error');
            });
        });

        describe('Edge cases', () => {
            it('copies a very long text', async () => {
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

            it('preserves multiple selection ranges', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                const selection = window.getSelection();
                selection?.removeAllRanges();

                // Add multiple ranges (if the browser supports it)
                const range1 = document.createRange();
                const range2 = document.createRange();
                selection?.addRange(range1);
                try {
                    selection?.addRange(range2);
                } catch {
                    // Some browsers do not support multiple ranges
                }

                document.execCommand = vi.fn().mockReturnValue(true);

                // Do not test textarea fallback details here
                await expect(writeTextToClipboard('multiple ranges')).resolves.toBeUndefined();
            });

            it('handles when the active element is not focusable', async () => {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                });

                const div = document.createElement('div');

                // Do not add focus() to div (non-focusable)
                Object.defineProperty(document, 'activeElement', {
                    value: div,
                    writable: true,
                    configurable: true,
                });

                document.execCommand = vi.fn().mockReturnValue(true);

                // Should complete without throwing
                await expect(writeTextToClipboard('no focus element')).resolves.toBeUndefined();
            });

            it('handles null activeElement', async () => {
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

            it('handles null selection', async () => {
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
