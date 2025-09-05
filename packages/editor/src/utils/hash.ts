import { deflate, inflate } from 'pako';

/**
 * Utilities for encoding data into URL hash.
 * - String <-> compressed base64
 * - Generate/read/clear URL hash
 */

export function encodeToHashBase64(input: string): string {
    const bytes = new TextEncoder().encode(input);
    const compressed = deflate(bytes);
    const base64 = btoa(String.fromCharCode(...compressed));
    return base64;
}

export function decodeFromHashBase64(hashBase64: string): string | null {
    try {
        const binaryString = atob(hashBase64);
        const bytes = new Uint8Array([...binaryString].map((c) => c.charCodeAt(0)));
        const decompressed = inflate(bytes);
        const decoded = new TextDecoder().decode(decompressed);
        return decoded;
    } catch {
        return null;
    }
}

export function readHashPayload(): string | null {
    const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!raw) return null;
    return raw;
}

export function clearHash(): void {
    history.replaceState(null, '', window.location.pathname + window.location.search);
}

export function buildShareUrlFromContent(content: string): string {
    const base64 = encodeToHashBase64(content);
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${base64}`;
    return url;
}
