export function isValidIanaTimeZone(tz: unknown): tz is string {
    if (typeof tz !== 'string' || tz.trim() === '') return false;
    try {
        const dtf = new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return dtf.resolvedOptions().timeZone === tz;
    } catch {
        return false;
    }
}

export function coerceIanaTimeZone(tz: unknown): string | undefined {
    const re = /^(?:\s*(?:UTC|GMT)\s*)?([+-])(\d{1,2})(?::?(\d{1,2}))?$/i;
    if (typeof tz === 'string') {
        const raw: string = tz.trim();
        if (raw === '') return undefined;
        // 1) If it's a valid IANA name, return as-is
        if (isValidIanaTimeZone(raw)) return raw;

        // 2) Normalize UTC/GMT or offset notation into a Luxon-acceptable form "UTC+HH:MM"
        //    Allowed: "+9", "+09", "+0900", "+09:00", and forms prefixed with "UTC"/"GMT"
        //    Examples: "UTC+9", "GMT+09:00", "+09:00", "-0530"
        const m1 = re.exec(raw);
        if (m1) {
            const sign = m1[1] === '-' ? '-' : '+';
            const hhNum = Number(m1[2]);
            const mmNum = m1[3] ? Number(m1[3]) : 0;
            if (Number.isFinite(hhNum) && Number.isFinite(mmNum)) {
                // General bounds check (IANA fixed offsets roughly range from +14:00 to -12:00)
                if (hhNum >= 0 && hhNum <= 14 && mmNum >= 0 && mmNum < 60) {
                    const hh = String(hhNum).padStart(2, '0');
                    const mm = String(mmNum).padStart(2, '0');
                    return `UTC${sign}${hh}:${mm}`;
                }
            }
        }

        // 3) Bare "UTC"/"GMT" is treated as UTC
        if (/^(UTC|GMT)$/i.test(raw)) return 'UTC+00:00';
    }
    return undefined;
}
