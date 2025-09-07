import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonacoEditor } from '@/components/MonacoEditor';
import { getTimezoneOptions } from '@/utils/timezone';

// Mock getTimezoneOptions
vi.mock('@/utils/timezone', () => ({
    getTimezoneOptions: vi.fn(() => ['UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London']),
}));

// Enhanced mock for Monaco Editor with onMount support
const mockRegisterCompletionItemProvider = vi.fn();
const mockMonaco = {
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { KeyS: 83 },
    languages: {
        registerCompletionItemProvider: mockRegisterCompletionItemProvider,
        CompletionItemKind: {
            Value: 12,
        },
    },
};

vi.mock('@monaco-editor/react', () => ({
    default: ({ value, language, options, height, onMount }: { value: string; language: string; options?: Record<string, unknown>; height: string; onMount?: (editor: any, monaco: any) => void }) => {
        // Call onMount if provided
        if (onMount) {
            const mockEditor = {
                addCommand: vi.fn(),
                getPosition: vi.fn(() => ({ lineNumber: 1 })),
                onDidChangeCursorPosition: vi.fn(),
                onDidChangeModelContent: vi.fn(),
            };
            onMount(mockEditor, mockMonaco);
        }

        return (
            <div data-testid="monaco-editor" data-language={language} data-height={height}>
                <div data-testid="editor-value">{value}</div>
                <div data-testid="editor-options">{JSON.stringify(options)}</div>
            </div>
        );
    },
}));

describe('MonacoEditor', () => {
    const mockOnChange = vi.fn();
    const mockOnSave = vi.fn();
    const mockOnCursorLineChange = vi.fn();
    const mockOnChangedLines = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic rendering', () => {
        it('renders the editor', () => {
            render(<MonacoEditor value="test content" onChange={mockOnChange} onSave={mockOnSave} />);

            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('renders with correct language setting', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toHaveAttribute('data-language', 'mdx');
        });

        it('displays the provided value', () => {
            const content = '## Title\n\nParagraph content';
            render(<MonacoEditor value={content} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            // Newlines are removed in actual rendering, but compare as-is here
            expect(valueElement.textContent).toBe(content);
        });

        it('sets correct options', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const optionsElement = screen.getByTestId('editor-options');
            const options = JSON.parse(optionsElement.textContent || '{}');

            expect(options).toMatchObject({
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'DM Mono, ui-monospace, monospace',
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                folding: true,
                renderWhitespace: 'selection',
                tabSize: 2,
                insertSpaces: true,
            });
        });
    });

    describe('Props validation', () => {
        it('defines required props', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} onCursorLineChange={mockOnCursorLineChange} onChangedLines={mockOnChangedLines} />);

            // Verify the component renders normally
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('works without optional props', () => {
            expect(() => {
                render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);
            }).not.toThrow();
        });
    });

    describe('Value updates', () => {
        it('reflects value updates', () => {
            const { rerender } = render(<MonacoEditor value="initial" onChange={mockOnChange} onSave={mockOnSave} />);

            let valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('initial');

            rerender(<MonacoEditor value="updated" onChange={mockOnChange} onSave={mockOnSave} />);

            valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('updated');
        });
    });

    describe('Edge cases', () => {
        it('handles very long content', () => {
            const longContent = 'line\n'.repeat(1000);

            render(<MonacoEditor value={longContent} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement.textContent).toBe(longContent);
        });

        it('handles content containing special characters', () => {
            const specialContent = '日本語\n한국어\n🎉\n<script>alert(1)</script>';

            render(<MonacoEditor value={specialContent} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement.textContent).toBe(specialContent);
        });

        it('handles empty content', () => {
            render(<MonacoEditor value="" onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('');
        });
    });

    describe('Component settings', () => {
        it('applies correct height', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toHaveAttribute('data-height', '100%');
        });

        it('applies Monaco theme', () => {
            // Theme is not passed via props; implementation uses a fixed value
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            // Verify the component renders normally
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });
    });

    describe('Timezone autocomplete', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('registers completion provider for mdx language', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            expect(mockRegisterCompletionItemProvider).toHaveBeenCalledWith(
                'mdx',
                expect.objectContaining({
                    triggerCharacters: ['@'],
                    provideCompletionItems: expect.any(Function),
                })
            );
        });

        it('provides timezone suggestions when @ is typed', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            // Get the registered completion provider
            const [, provider] = mockRegisterCompletionItemProvider.mock.calls[0];

            // Mock model and position for testing
            const mockModel = {
                getValueInRange: vi.fn(() => 'Some text @'),
            };
            const mockPosition = {
                lineNumber: 1,
                column: 12,
            };

            // Call the provider
            const result = provider.provideCompletionItems(mockModel, mockPosition);

            // Check that timezones are included in suggestions
            expect(result.suggestions).toContainEqual(
                expect.objectContaining({
                    label: 'Asia/Tokyo',
                    kind: mockMonaco.languages.CompletionItemKind.Value,
                    insertText: 'Asia/Tokyo',
                    detail: 'Timezone',
                })
            );

            // No UTC offset suggestions expected anymore
            const utcOffsets = result.suggestions.filter((s: any) => s.detail === 'UTC Offset');
            expect(utcOffsets.length).toBe(0);
        });

        it('does not provide suggestions when @ is not typed', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const [, provider] = mockRegisterCompletionItemProvider.mock.calls[0];

            const mockModel = {
                getValueInRange: vi.fn(() => 'Some text without at sign'),
            };
            const mockPosition = {
                lineNumber: 1,
                column: 25,
            };

            const result = provider.provideCompletionItems(mockModel, mockPosition);

            expect(result.suggestions).toEqual([]);
        });

        it('uses getTimezoneOptions to fetch timezone list', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const [, provider] = mockRegisterCompletionItemProvider.mock.calls[0];

            const mockModel = {
                getValueInRange: vi.fn(() => '@'),
            };
            const mockPosition = {
                lineNumber: 1,
                column: 2,
            };

            provider.provideCompletionItems(mockModel, mockPosition);

            expect(getTimezoneOptions).toHaveBeenCalled();
        });

        it('provides IANA timezones only (no UTC offsets)', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const [, provider] = mockRegisterCompletionItemProvider.mock.calls[0];

            const mockModel = {
                getValueInRange: vi.fn(() => 'Test @'),
            };
            const mockPosition = {
                lineNumber: 1,
                column: 7,
            };

            const result = provider.provideCompletionItems(mockModel, mockPosition);

            // IANA timezones are present
            const ianaTimezones = result.suggestions.filter((s: any) => s.detail === 'Timezone');
            expect(ianaTimezones.length).toBeGreaterThan(0);

            const utcOffsets = result.suggestions.filter((s: any) => s.detail === 'UTC Offset');
            expect(utcOffsets.length).toBe(0);
        });
    });
});
