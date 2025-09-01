export function isValidIanaTimeZone(tz: unknown): tz is string {
    if (typeof tz !== 'string' || tz.trim() === '') return false;
    try {
        const dtf = new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return dtf.resolvedOptions().timeZone === tz;
    } catch {
        return false;
    }
}

export function coerceIanaTimeZone(tz: unknown, fallback?: string): string | undefined {
    return isValidIanaTimeZone(tz) ? tz : fallback;
}
