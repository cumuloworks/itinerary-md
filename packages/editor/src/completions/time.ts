// Time completion: [hh:mm], [hh:mm] - [hh:mm], @timezone inside brackets
export function registerTimeCompletion(monaco: any): { dispose: () => void } {
    const P = '$'; // escape placeholder to avoid linter complaining about template-like strings
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['['],
        provideCompletionItems: (model: any, position: any) => {
            const lineText = model.getLineContent(position.lineNumber);
            const textUntil = lineText.slice(0, position.column - 1);

            const suggestions: any[] = [];

            // Heuristics: if line begins with '[' or we are within first token, propose time snippets
            const trimmed = textUntil.trimStart();
            const isAtLineStart = textUntil.length - trimmed.length <= 2;

            if (/\[$/.test(textUntil) || isAtLineStart) {
                const col = position.column;
                const typedOpenBracket = /\[$/.test(textUntil);
                const range = typedOpenBracket
                    ? {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: Math.max(1, col - 1),
                          endColumn: col,
                      }
                    : {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: col,
                          endColumn: col,
                      };
                suggestions.push(
                    {
                        label: '[hh:mm] time',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ['[', `${P}{1:09}`, ':', `${P}{2:00}`, '] '].join(''),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'Insert time',
                        range,
                    },
                    {
                        label: '[hh:mm] - [hh:mm] range',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ['[', `${P}{1:09}`, ':', `${P}{2:00}`, '] - [', `${P}{3:11}`, ':', `${P}{4:30}`, '] '].join(''),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'Insert time range',
                        range,
                    },
                    {
                        label: '[AM]/[PM] marker',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ['[', `${P}{1|AM,PM|}`, '] '].join(''),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'Insert AM/PM marker',
                        range,
                    }
                );
            }

            // Within [hh:mm@] suggest timezone
            const openIdx = textUntil.lastIndexOf('[');
            const closeIdx = textUntil.lastIndexOf(']');
            if (openIdx >= 0 && closeIdx < openIdx) {
                const inside = textUntil.slice(openIdx + 1);
                // hint for timezone symbol
                if (/@$/.test(inside)) {
                    const col = position.column;
                    const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: col, endColumn: col };
                    suggestions.push({
                        label: 'Timezone (type @ to trigger suggestions)',
                        kind: monaco.languages.CompletionItemKind.Text,
                        insertText: '',
                        range,
                    });
                }
            }

            return { suggestions };
        },
    });
}
