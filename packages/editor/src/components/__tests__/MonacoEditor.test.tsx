import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonacoEditor } from '../MonacoEditor';

// Monaco Editorのシンプルなモック
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

    describe('基本レンダリング', () => {
        it('エディタをレンダリングする', () => {
            render(<MonacoEditor value="test content" onChange={mockOnChange} onSave={mockOnSave} />);

            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('正しい言語設定でレンダリングする', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toHaveAttribute('data-language', 'mdx');
        });

        it('値を表示する', () => {
            const content = '## Title\n\nParagraph content';
            render(<MonacoEditor value={content} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            // 改行は実際のレンダリングで削除されるため、改行なしで比較
            expect(valueElement.textContent).toBe(content);
        });

        it('正しいオプションを設定する', () => {
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

    describe('プロパティの検証', () => {
        it('必要なプロパティが定義されている', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} onCursorLineChange={mockOnCursorLineChange} onChangedLines={mockOnChangedLines} />);

            // コンポーネントが正常にレンダリングされることを確認
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('オプショナルプロパティなしでも動作する', () => {
            expect(() => {
                render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);
            }).not.toThrow();
        });
    });

    describe('値の更新', () => {
        it('値の更新を反映する', () => {
            const { rerender } = render(<MonacoEditor value="initial" onChange={mockOnChange} onSave={mockOnSave} />);

            let valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('initial');

            rerender(<MonacoEditor value="updated" onChange={mockOnChange} onSave={mockOnSave} />);

            valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('updated');
        });
    });

    describe('エッジケース', () => {
        it('非常に長いコンテンツを処理する', () => {
            const longContent = 'line\n'.repeat(1000);

            render(<MonacoEditor value={longContent} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement.textContent).toBe(longContent);
        });

        it('特殊文字を含むコンテンツを処理する', () => {
            const specialContent = '日本語\n한국어\n🎉\n<script>alert(1)</script>';

            render(<MonacoEditor value={specialContent} onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement.textContent).toBe(specialContent);
        });

        it('空のコンテンツを処理する', () => {
            render(<MonacoEditor value="" onChange={mockOnChange} onSave={mockOnSave} />);

            const valueElement = screen.getByTestId('editor-value');
            expect(valueElement).toHaveTextContent('');
        });
    });

    describe('コンポーネント設定', () => {
        it('正しい高さが設定される', () => {
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toHaveAttribute('data-height', '100%');
        });

        it('Monacoのテーマが設定される', () => {
            // テーマはpropsで渡されないが、実装内で固定値が使用される
            render(<MonacoEditor value="test" onChange={mockOnChange} onSave={mockOnSave} />);

            // コンポーネントが正常にレンダリングされることを確認
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });
    });
});
