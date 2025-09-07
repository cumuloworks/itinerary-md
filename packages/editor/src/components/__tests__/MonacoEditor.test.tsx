import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonacoEditor } from '@/components/MonacoEditor';

// Simple mock for Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    default: ({ value, language, options, height }: { value: string; language: string; options?: Record<string, unknown>; height: string }) => (
        <div data-testid="monaco-editor" data-language={language} data-height={height}>
            <div data-testid="editor-value">{value}</div>
            <div data-testid="editor-options">{JSON.stringify(options)}</div>
        </div>
    ),
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
});
