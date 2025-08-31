export async function writeTextToClipboard(text: string): Promise<void> {
    // Try to use the modern clipboard API first
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (error) {
            // Fall back to textarea method if clipboard API fails
            console.warn('Clipboard API failed, falling back to textarea method:', error);
        }
    }

    // Fallback method using textarea and execCommand
    // Save current selection and active element to restore later
    const selection = document.getSelection();
    const savedRanges: Range[] = [];
    if (selection && selection.rangeCount > 0) {
        for (let i = 0; i < selection.rangeCount; i++) {
            savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
    }
    const activeElement = document.activeElement as HTMLElement | null;

    // Create temporary textarea for copying
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px'; // Move off-screen instead of opacity for better compatibility
    textarea.style.top = '0';
    textarea.setAttribute('readonly', ''); // Prevent virtual keyboard on mobile

    document.body.appendChild(textarea);

    try {
        // Select and copy the text
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
    } finally {
        // Clean up textarea
        document.body.removeChild(textarea);

        // Restore previous selection
        if (selection && savedRanges.length > 0) {
            selection.removeAllRanges();
            for (const range of savedRanges) {
                selection.addRange(range);
            }
        }

        // Restore focus to previously active element
        if (activeElement && typeof activeElement.focus === 'function') {
            activeElement.focus();
        }
    }
}
