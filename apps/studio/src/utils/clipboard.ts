export async function writeTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (error) {
            console.warn('Clipboard API failed, falling back to textarea method:', error);
        }
    }

    const selection = document.getSelection();
    const savedRanges: Range[] = [];
    if (selection && selection.rangeCount > 0) {
        for (let i = 0; i < selection.rangeCount; i++) {
            savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
    }
    const activeElement = document.activeElement as HTMLElement | null;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);

    try {
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textarea);

        if (selection && savedRanges.length > 0) {
            selection.removeAllRanges();
            for (const range of savedRanges) {
                selection.addRange(range);
            }
        }

        if (activeElement && typeof activeElement.focus === 'function') {
            activeElement.focus();
        }
    }
}
