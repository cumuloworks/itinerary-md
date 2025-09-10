// Date completion for H2 headings: "## YYYY-MM-DD" (optionally followed by "@timezone")
// This helps users quickly insert date headings that are recognized by the core parser.

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function formatDate(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
}

export function registerDateCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['#', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        provideCompletionItems: (model: any, position: any) => {
            const textUntil = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Offer only when the line begins with exactly '##' (no leading spaces) and not '###'
            const m = textUntil.match(/^##(?!#)(\s*)([0-9-]*)$/);
            if (!m) return { suggestions: [] };

            const spacesAfter = m[1]?.length ?? 0;
            // Replace from after '##' and any spaces following it
            const startColumn = 3 + spacesAfter; // 1-based column after '##' + spaces
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: startColumn,
                endColumn: position.column,
            };

            const today = new Date();
            const dates = [
                { label: 'Today', date: formatDate(today) },
                { label: 'Tomorrow', date: formatDate(addDays(today, 1)) },
            ];

            const suggestions = dates.map((d) => ({
                label: `## ${d.date}`,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: ` ${d.date} `,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: `${d.label} date`,
                range,
            }));

            return { suggestions };
        },
    });
}
