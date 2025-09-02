/**
 * Check if a URL is allowed for linking (https or anchor)
 */
export function isAllowedHref(href?: string): boolean {
    if (!href) return false;
    return href.startsWith('https://') || href.startsWith('#');
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
    return src.startsWith('https://');
}

/**
 * Build a Google Maps search URL for a location
 */
export function buildGoogleMapsSearchUrl(location: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
