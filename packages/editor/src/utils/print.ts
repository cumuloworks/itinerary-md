/**
 * Utilities for printing the preview content in a separate window.
 * The function opens a new window with collected styles and triggers print.
 */
import { notifyError } from '@/core/errors';
import { triggerDownload } from '@/utils/download';
import { sanitizeFileName } from '@/utils/url';

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
    const autoPrintScript = `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 150); });</script>`;
    const baseHref = document.baseURI || `${window.location.origin}/`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${baseHref}"><title>${escapedTitle}</title>${styleSheets}${inlineStyleTags}${extraStyle}</head><body>${bodyInner}${autoPrintScript}</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const width = 960;
    const height = 700;
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));
    const features = `noopener,scrollbars=yes,resizable=yes,toolbar=0,menubar=0,location=0,status=0,width=${width},height=${height},left=${left},top=${top}`;
    const win = window.open(url, 'tripmd-print', features);

    // Handle popup blocked case: notify user and fall back to download
    if (!win) {
        // Revoke immediately since no window will use the blob URL
        URL.revokeObjectURL(url);
        try {
            notifyError('Popup was blocked. Downloading the printable HTML instead.');
        } catch {}
        const safeBase = sanitizeFileName(escapedTitle).trim() || 'print';
        triggerDownload({ data: html, fileName: `${safeBase}.html`, mimeType: 'text/html;charset=utf-8' });
        return;
    }

    // Extra guard even with 'noopener' feature
    try {
        win.opener = null;
    } catch {}

    // Revoke the blob URL safely after the new window has loaded/closed
    let revoked = false;
    const revokeSafely = () => {
        if (revoked) return;
        revoked = true;
        URL.revokeObjectURL(url);
    };

    // Poll for window close to revoke promptly
    const pollId = window.setInterval(() => {
        if (win.closed) {
            window.clearInterval(pollId);
            window.clearTimeout(fallbackId);
            revokeSafely();
        }
    }, 1000);

    // Fallback revoke in case close is not detectable
    const fallbackId = window.setTimeout(
        () => {
            window.clearInterval(pollId);
            revokeSafely();
        },
        2 * 60 * 1000
    );

    // Best-effort: attempt revoke shortly after the child window reports 'load'
    try {
        win.addEventListener('load', () => {
            window.setTimeout(() => {
                window.clearTimeout(fallbackId);
                revokeSafely();
            }, 10000);
        });
    } catch {}
}
