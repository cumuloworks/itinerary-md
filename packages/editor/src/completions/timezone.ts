// Register timezone completion triggered by '@'
// Comments in code must be in English
import { getTimezoneOptions } from '@/utils/timezone';

export function registerTimezoneCompletion(monaco: any): { dispose: () => void } {
    const disposable = monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: ['@'],
        provideCompletionItems(model: any, position: any) {
            try {
                const rangeFullLine = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: 1,
                    endColumn: position.column,
                };
                const textBefore = model.getValueInRange(rangeFullLine) as string;
                if (!textBefore.includes('@')) return { suggestions: [] };

                const timezones = getTimezoneOptions();
                const suggestions = timezones.map((tz: string) => ({
                    label: tz,
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: tz,
                    detail: 'Timezone',
                }));
                return { suggestions };
            } catch {
                return { suggestions: [] };
            }
        },
    });
    return {
        dispose: () => {
            try {
                disposable?.dispose?.();
            } catch {}
        },
    };
}
