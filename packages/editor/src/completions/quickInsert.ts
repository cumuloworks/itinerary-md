// Quick insert snippets on empty line start: "## yyyy-mm-dd" or "> [hh:mm] event"
// Avoid linter warnings about template placeholders by escaping '$'
const P = '$';

export function registerQuickInsertCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        // Suggestions are also shown when user presses Ctrl+Space even without triggers.
        triggerCharacters: ['#', '>', ' ', '\t'],
        provideCompletionItems: (model: any, position: any) => {
            const textUntil = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Only when nothing typed on the line before the cursor (allow whitespace)
            if (textUntil.trim() !== '') return { suggestions: [] };

            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: 1,
                endColumn: position.column,
            };

            const suggestions = [
                {
                    label: '## yyyy-mm-dd',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['## ', P, '{1:yyyy}', '-', P, '{2:mm}', '-', P, '{3:dd}', ' '].join(''),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Insert date heading at line start',
                    range,
                },
                {
                    label: '> [hh:mm] event',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['> [', P, '{1:09}', ':', P, '{2:00}', '] ', P, '{3:event}', ' '].join(''),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Insert time event blockquote',
                    range,
                },
            ];

            return { suggestions };
        },
    });
}
