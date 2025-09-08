/**
 * Check if a URL is allowed for linking (https or relative)
 */
export function isAllowedHref(href?: string): boolean {
    if (!href) return false;
    return href.startsWith('https://') || href.startsWith('/') || href.startsWith('#');
}

/**
 * Check if a URL is an external HTTP/HTTPS URL
 */
export function isExternalHttpUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

/**
 * Check if an image source is allowed
 */
export function isAllowedImageSrc(src?: string): boolean {
    if (!src) return false;
    return src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/');
}

/**
 * Build a Google Maps search URL for a location
 */
export function buildGoogleMapsSearchUrl(location: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/**
 * Make a safe file name from arbitrary input by removing reserved characters and trimming length.
 * Allows Unicode letters and numbers (e.g. Japanese), spaces, dashes, underscores and dots.
 * Replaces reserved/control characters with spaces, collapses whitespace, trims, and shortens.
 */
export function sanitizeFileName(input: string): string {
    // Replace Windows-reserved characters with spaces
    const withoutReserved = input.replace(/[\\/:*?"<>|]/g, ' ');
    // Replace ASCII control chars (0x00-0x1F) with spaces
    let withoutControl = '';
    for (let i = 0; i < withoutReserved.length; i++) {
        const ch = withoutReserved[i];
        const code = ch.charCodeAt(0);
        withoutControl += code < 32 ? ' ' : ch;
    }
    // Collapse whitespace
    const collapsed = withoutControl.replace(/\s+/g, ' ').trim();
    // Keep Unicode letters/numbers plus space, underscore, dash, and dot
    const safe = collapsed.replace(/[^\p{L}\p{N} _.-]/gu, '');
    // Avoid trailing dots/spaces which are problematic on Windows
    const trimmed = safe.replace(/[. ]+$/u, '');
    const base = trimmed || 'file';
    return base.slice(0, 120);
}
