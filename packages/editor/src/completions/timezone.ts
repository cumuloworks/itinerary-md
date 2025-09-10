import { getTimezoneOptions } from '@/utils/timezone';

/**
 * Register timezone completion provider for Monaco.
 * This registers suggestions for IANA timezones and common UTC offset formats
 * when the user types '@' in MDX documents.
 */
export function registerTimezoneCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        provideCompletionItems: (model: any, position: any) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            const dateEndStrict = /(?:^|[^\d])\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
            const timeEndStrict = /(?:^|[^\d])(?:[01]\d|2[0-3]):[0-5]\d$/;

            let eligible = false;
            let replaceRange = null as null | { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };

            if (textUntilPosition.endsWith('@')) {
                const beforeAt = textUntilPosition.slice(0, -1);
                if (dateEndStrict.test(beforeAt) || timeEndStrict.test(beforeAt)) {
                    eligible = true;
                    replaceRange = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: Math.max(1, position.column - 1),
                        endColumn: position.column,
                    };
                }
            } else if (dateEndStrict.test(textUntilPosition) || timeEndStrict.test(textUntilPosition)) {
                eligible = true;
                replaceRange = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column,
                };
            }

            if (!eligible) return { suggestions: [] };

            const timezones = getTimezoneOptions();
            const safeRange = replaceRange ?? {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column,
            };
            const suggestions = timezones.map((tz) => ({
                label: `@${tz}`,
                kind: monaco.languages.CompletionItemKind.Value,
                insertText: `@${tz}`,
                detail: 'Timezone',
                documentation: `IANA timezone: ${tz}`,
                range: safeRange,
            }));

            return { suggestions };
        },
    });
}
