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
 * Detect if the given href is a Google Maps search URL we generate
 */
export function isGoogleMapsSearchUrl(href?: string): boolean {
    if (!href) return false;
    try {
        const u = new URL(href, 'https://example.com');
        return /(^|\.)google\.com$/i.test(u.hostname) && u.pathname.toLowerCase().startsWith('/maps/search') && (u.searchParams.has('api') || u.searchParams.has('query'));
    } catch {
        return false;
    }
}

/**
 * Make a safe file name from arbitrary input by removing reserved characters and trimming length.
 * Allows Unicode letters and numbers (e.g. Japanese), spaces, dashes, underscores and dots.
 * Replaces reserved/control characters with spaces, collapses whitespace, trims, and shortens.
 */
export function sanitizeFileName(input: string): string {
    // Normalize to NFKC to unify forms (e.g., full-width/half-width)
    const normalized = input.normalize('NFKC');
    // Windows reserved device names
    const WINDOWS_RESERVED_BASENAMES = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);
    // Replace Windows-reserved characters with spaces
    const withoutReserved = normalized.replace(/[\\/:*?"<>|]/g, ' ');
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
    let base = trimmed || 'file';
    // Avoid device-reserved basenames (case-insensitive)
    if (WINDOWS_RESERVED_BASENAMES.has(base.toUpperCase())) {
        base = `_${base}`;
    }
    return base.slice(0, 120);
}
