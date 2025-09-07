import { getTimezoneOptions } from '@/utils/timezone';

/**
 * Register timezone completion provider for Monaco.
 * This registers suggestions for IANA timezones and common UTC offset formats
 * when the user types '@' in MDX documents.
 */
export function registerTimezoneCompletion(monaco: any): void {
    monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['@'],
        provideCompletionItems: (model: any, position: any) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            if (textUntilPosition.endsWith('@')) {
                const timezones = getTimezoneOptions();
                const suggestions = timezones.map((tz) => ({
                    label: tz,
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: tz,
                    detail: 'Timezone',
                    documentation: `IANA timezone: ${tz}`,
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endColumn: position.column,
                    },
                }));

                return { suggestions };
            }

            return { suggestions: [] };
        },
    });
}
