// Alert block completion for GitHub-style [!NOTE] etc inside blockquotes

const ALERTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

export function registerAlertCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['>', '[', '!'],
        provideCompletionItems: (model: any, position: any) => {
            const line = model.getLineContent(position.lineNumber);
            const until = line.slice(0, position.column - 1);
            if (!/^\s*>\s*/.test(until)) return { suggestions: [] };

            // 直前の"["や"[!"(および続く英字)を含めて置換して重複を防ぐ
            const prefix = until.match(/\[!?[A-Za-z]*$/);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - (prefix ? prefix[0].length : 0),
                endColumn: position.column,
            };
            const suggestions = ALERTS.map((a) => ({
                label: `[!${a}]`,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: `[!${a}] ${a === 'NOTE' ? 'Note' : a.charAt(0) + a.slice(1).toLowerCase()}`,
                detail: 'alert block',
                range,
            }));
            return { suggestions };
        },
    });
}
