// Event type completion after time header

const EVENT_TYPES = [
    'flight',
    'train',
    'bus',
    'subway',
    'ferry',
    'taxi',
    'drive',
    'cablecar',
    'rocket',
    'spaceship',
    'stay',
    'hotel',
    'hostel',
    'ryokan',
    'dormitory',
    'meal',
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'cafe',
    'activity',
    'museum',
    'sightseeing',
    'shopping',
    'spa',
    'park',
];

function getCurrentWord(textUntil: string): string {
    const m = textUntil.match(/([A-Za-z]+)$/);
    return m ? m[1] : '';
}

export function registerEventTypeCompletion(monaco: any): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('mdx', {
        triggerCharacters: [' ', '\t'],
        provideCompletionItems: (model: any, position: any) => {
            const line = model.getLineContent(position.lineNumber);
            const until = line.slice(0, position.column - 1);

            // Only offer when cursor is after time close-bracket and a space
            // - numeric time: "[09:00] " or "[09:00] - [10:30] "
            // - AM/PM marker: "[AM] " or "[AM] - [PM] "
            const isAfterNumericTimeSpace = /^\s*\[(\d{1,2}:\d{2})\](?:\s*-\s*\[(\d{1,2}:\d{2})\])?\s+[A-Za-z]*$/.test(until);
            const isAfterAmPmSpace = /^\s*\[(AM|PM)\](?:\s*-\s*\[(AM|PM)\])?\s+[A-Za-z]*$/i.test(until);
            if (!(isAfterNumericTimeSpace || isAfterAmPmSpace)) return { suggestions: [] };

            // Avoid suggesting after a destination separator has appeared
            if (/\s(::|at|from)\s/i.test(until)) return { suggestions: [] };

            const word = getCurrentWord(until);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - word.length,
                endColumn: position.column,
            };
            const lc = word.toLowerCase();
            const items = EVENT_TYPES.filter((t) => t.startsWith(lc)).map((t) => ({
                label: t,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: t,
                detail: 'event type',
                range,
            }));
            return { suggestions: items };
        },
    });
}
