// Price and math expression completion

const CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'KRW', 'SGD', 'THB'];

export function registerPriceCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['{', '}', '+', '-', '*', '/', '%', '^', '(', ')', ' '],
        provideCompletionItems: (model: any, position: any) => {
            const line = model.getLineContent(position.lineNumber);
            const until = line.slice(0, position.column - 1);
            const suggestions: any[] = [];

            // Math expression snippet inside braces
            if (/\{$/.test(until) || /\{[\s0-9+\-*/%^().]*$/.test(until)) {
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column,
                };
                suggestions.push(
                    {
                        label: '{qty*unit}',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return [`${P}{1:2}`, '*', `${P}{2:100}`].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'math expression',
                        range,
                    },
                    {
                        label: '(a+b)*c',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: ((): string => {
                            const P = '$';
                            return ['(', `${P}{1:a}`, '+', `${P}{2:b}`, ')*', `${P}{3:c}`].join('');
                        })(),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'grouping',
                        range,
                    }
                );
            }

            // Currency codes near amounts
            const amountLike = /(\d|\})\s*$/.test(until);
            if (amountLike) {
                const word = '';
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - word.length,
                    endColumn: position.column,
                };
                suggestions.push(
                    ...CURRENCIES.map((ccy) => ({
                        label: ccy,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: ccy,
                        detail: 'currency code',
                        range,
                    }))
                );
            }

            return { suggestions };
        },
    });
}
