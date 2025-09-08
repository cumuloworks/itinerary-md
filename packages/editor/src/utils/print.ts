/**
 * Utilities for printing the preview content in a separate window.
 * The function opens a new window with collected styles and triggers print.
 */

export interface PrintOptions {
    /** Title used in the print window */
    title: string;
    /** Preferred HTML container to render (e.g., preview element). If omitted, fallbackMarkdown is used. */
    container?: HTMLElement | null;
    /** Fallback raw Markdown text to render when container is not provided */
    fallbackMarkdown?: string;
}

/**
 * Open a new window for printing with the given content.
 * Throws on errors; callers should handle user-facing notifications.
 */
export function openPrintWindow(options: PrintOptions): void {
    const { title, container, fallbackMarkdown } = options;

    // Collect existing stylesheet links (best effort)
    const styleLinks: string[] = [];
    const linkNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    for (const ln of linkNodes) {
        if (ln.href) styleLinks.push(ln.href);
    }
    const styleSheets = styleLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
    const inlineStyleTags = Array.from(document.querySelectorAll('style'))
        .map((el) => el.outerHTML)
        .join('');

    const extraStyle = `
                <style>
                @page { size: auto; margin: 12mm; }
                html, body { background: white; }
                .markdown-preview { padding: 0; }
                .print-container { max-width: 210mm; margin: 0 auto; }
                /* Avoid page break after headings */
                h1, h2, h3 { break-after: avoid-page; page-break-after: avoid; }
                /* Force page break before each day (with legacy property) */
                .itmd-day { break-before: page; page-break-before: always; }
                </style>
            `;

    const bodyInner = (() => {
        if (container) return `<div class="print-container">${container.innerHTML}</div>`;
        const raw = fallbackMarkdown || '';
        const escaped = raw.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
        return `<pre>${escaped}</pre>`;
    })();
    const autoPrintScript = `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 150); });</script>`;
    const baseHref = document.baseURI || `${window.location.origin}/`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${baseHref}"><title>${title}</title>${styleSheets}${inlineStyleTags}${extraStyle}</head><body>${bodyInner}${autoPrintScript}</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const width = 960;
    const height = 700;
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));
    const features = `noopener,scrollbars=yes,resizable=yes,toolbar=0,menubar=0,location=0,status=0,width=${width},height=${height},left=${left},top=${top}`;
    window.open(url, 'tripmd-print', features);
    // Clean up the blob URL after some delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
