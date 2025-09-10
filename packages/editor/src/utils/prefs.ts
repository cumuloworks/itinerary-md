// Lightweight preference utilities for consistent localStorage handling
// Comments in code must be in English

const PREFIX = 'itinerary-md-';

export const prefKeys = {
    showPast: `${PREFIX}show-past`,
    autoScroll: `${PREFIX}auto-scroll`,
    altNames: `${PREFIX}alt-names`,
    editorAssist: `${PREFIX}editor-assist`,
    language: `${PREFIX}language`,
} as const;

export function readString(key: string, fallback?: string): string | undefined {
    try {
        const v = localStorage.getItem(key);
        return v ?? fallback;
    } catch {
        return fallback;
    }
}

export function writeString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

export function readBoolean(key: string, fallback: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        if (v === null) return fallback;
        if (v === '1' || v === 'true') return true;
        if (v === '0' || v === 'false') return false;
        return fallback;
    } catch {
        return fallback;
    }
}

export function writeBoolean(key: string, value: boolean): void {
    writeString(key, value ? '1' : '0');
}
