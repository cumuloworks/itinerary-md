// Destination separators and route helpers

function currentTokenRange(until: string, position: any) {
    const m = until.match(/([A-Za-z:\-\s]+)$/);
    const token = m ? m[1] : '';
    return {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - token.length,
        endColumn: position.column,
    };
}

export function registerDestinationCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: [':', 'a', 'f', 't', 'v', '-', ' '],
        provideCompletionItems: (model: any, position: any) => {
            const line = model.getLineContent(position.lineNumber);
            const until = line.slice(0, position.column - 1);

            // Offer only if we likely have time and maybe event type
            if (!/^\s*\[(.*?)\]/.test(until)) return { suggestions: [] };

            const suggestions: any[] = [];

            // If no destination separator present, suggest primary separators
            if (!/(\s::\s|\sat\s|\sfrom\s)/i.test(until)) {
                const range = currentTokenRange(until, position);
                suggestions.push(
                    {
                        label: ' :: ',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ' :: ',
                        detail: 'single place separator',
                        range,
                    },
                    {
                        label: ' at ',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ' at ',
                        detail: 'single place separator',
                        range,
                    },
                    {
                        label: ' from ... to ...',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return [' from ', P + '{1:Origin}', ' to ', P + '{2:Destination}'].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'route separator',
                        range,
                    },
                    {
                        label: ' from ... via ... to ...',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return [' from ', P + '{1:Origin}', ' via ', P + '{2:Stop}', ' to ', P + '{3:Destination}'].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'route with via',
                        range,
                    },
                    {
                        label: ' A - B - C',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return [' ', P + '{1:A}', ' - ', P + '{2:B}', ' - ', P + '{3:C}'].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'dash separated route',
                        range,
                    }
                );
            } else {
                // If already in a route, suggest via/to add-ons
                const range = currentTokenRange(until, position);
                if (/\sfrom\s[\s\S]*$/i.test(until) && !/\sto\s[\s\S]*$/i.test(until)) {
                    suggestions.push(
                        {
                            label: ' to ...',
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: ((): string => {
                                const P = '$';
                                return [' to ', P + '{1:Destination}'].join('');
                            })(),
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: 'complete route with destination',
                            range,
                        },
                        {
                            label: ' via ...',
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: ((): string => {
                                const P = '$';
                                return [' via ', P + '{1:Stop}'].join('');
                            })(),
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: 'add stopover',
                            range,
                        }
                    );
                } else if (/\s-\s[\s\S]*$/.test(until)) {
                    suggestions.push({
                        label: ' - Next',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return [' - ', P + '{1:Next}'].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'add next stop',
                        range,
                    });
                }
            }

            return { suggestions };
        },
    });
}
