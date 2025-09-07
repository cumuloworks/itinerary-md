export function normalizeTimezone(value: unknown, fallback?: string | null): string | null {
    try {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw) return fallback ?? null;
        // Reuse local implementation from time/iana to avoid new deps
        const re = /^(?:\s*(?:UTC|GMT)\s*)?([+-])(\d{1,2})(?::?(\d{1,2}))?$/i;
        const canonicalizeTimeZone = (tz: string): string | null => {
            try {
                const ro = new Intl.DateTimeFormat(undefined, { timeZone: tz }).resolvedOptions();
                // ro.timeZone は正規化済みの IANA 名
                return ro.timeZone || null;
            } catch {
                return null;
            }
        };
        // Handle bare UTC/GMT first -> always coerce to explicit offset
        if (/^(UTC|GMT)$/i.test(raw)) return 'UTC+00:00';
        // Then handle explicit offsets
        const m1 = re.exec(raw);
        if (m1) {
            const sign = m1[1] === '-' ? '-' : '+';
            const hhNum = Number(m1[2]);
            const mmNum = m1[3] ? Number(m1[3]) : 0;
            if (Number.isFinite(hhNum) && Number.isFinite(mmNum) && hhNum >= 0 && hhNum <= 14 && mmNum >= 0 && mmNum < 60) {
                const hh = String(hhNum).padStart(2, '0');
                const mm = String(mmNum).padStart(2, '0');
                return `UTC${sign}${hh}:${mm}`;
            }
        }
        // Finally, accept and return canonical IANA name
        const cz = canonicalizeTimeZone(raw);
        if (cz) return cz;
        return fallback ?? null;
    } catch {
        return fallback ?? null;
    }
}

export function normalizeCurrency(value: unknown, fallback: string = 'USD'): string {
    try {
        const raw = String(value ?? '')
            .toUpperCase()
            .trim()
            .slice(0, 3);
        return /^[A-Z]{3}$/.test(raw) ? raw : fallback;
    } catch {
        return fallback;
    }
}
