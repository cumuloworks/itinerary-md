/**
 * Utilities for printing the preview content without relying on popups.
 * This implementation uses a hidden iframe to render HTML and trigger print,
 * avoiding popup blockers and unintended downloads of .html files.
 */
import { notifyError } from '@/core/errors';

export interface PrintOptions {
    /** Title used in the print window */
    title: string;
    /** Preferred HTML container to render (e.g., preview element). If omitted, fallbackMarkdown is used. */
    container?: HTMLElement | null;
    /** Fallback raw Markdown text to render when container is not provided */
    fallbackMarkdown?: string;
}

/**
 * Escape HTML special characters to prevent injection in HTML contexts.
 * Replaces &, <, >, " and ' with their corresponding entities.
 */
function escapeHtml(input: string): string {
    return input.replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return ch;
        }
    });
}

/**
 * Open a new window for printing with the given content.
 * Throws on errors; callers should handle user-facing notifications.
 */
export function openPrintWindow(options: PrintOptions): void {
    const { title, container, fallbackMarkdown } = options;
    const escapedTitle = escapeHtml(title);

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
    // Do not auto-print inside the iframe content. The parent will trigger print once.
    const autoPrintScript = ``;
    const baseHref = document.baseURI || `${window.location.origin}/`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${baseHref}"><title>${escapedTitle}</title>${styleSheets}${inlineStyleTags}${extraStyle}</head><body>${bodyInner}${autoPrintScript}</body></html>`;

    // Use a hidden iframe to avoid popup blockers and downloads
    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.setAttribute('title', 'print-frame');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    const cleanup = () => {
        try {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        } catch {}
    };

    // Ensure we only trigger print once
    let printed = false;

    // Attach load handler before setting content
    iframe.addEventListener('load', () => {
        if (printed) return;
        try {
            const frameWindow = iframe.contentWindow;
            if (!frameWindow) throw new Error('No frame window');
            // Small delay to allow external styles to settle
            window.setTimeout(() => {
                try {
                    if (printed) return;
                    printed = true;
                    frameWindow.focus();
                    frameWindow.print();
                } catch {
                    try {
                        notifyError('Failed to open print dialog');
                    } catch {}
                } finally {
                    // Remove iframe after a short delay to not interrupt printing
                    window.setTimeout(cleanup, 1000);
                }
            }, 300);
        } catch {
            try {
                notifyError('Failed to prepare print preview');
            } catch {}
            cleanup();
        }
    });

    document.body.appendChild(iframe);

    try {
        // Prefer srcdoc for simplicity; if it fails, fall back to writing the document
        iframe.srcdoc = html;
    } catch {
        try {
            const doc = iframe.contentDocument;
            if (!doc) throw new Error('No frame document');
            doc.open();
            doc.write(html);
            doc.close();
        } catch {
            try {
                notifyError('Failed to render content for printing');
            } catch {}
            cleanup();
        }
    }
}
