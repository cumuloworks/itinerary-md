import { DateTime } from 'luxon';
export function getTimezoneOptions(): string[] {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Singapore'];
}

export function isValidIanaTimeZone(tz: unknown): boolean {
    if (typeof tz !== 'string' || !tz.trim()) return false;
    try {
        const dtf = new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return dtf.resolvedOptions().timeZone === tz;
    } catch {
        return false;
    }
}

import { notifyError } from '../core/errors';

export function coerceTimezoneWithToast(tz: unknown, fallback: string, source: string): string {
    if (typeof tz === 'string') {
        try {
            const dtf = new Intl.DateTimeFormat(undefined, { timeZone: tz });
            if (dtf.resolvedOptions().timeZone === tz) return tz;
        } catch {}
    }
    notifyError(`${source}: Invalid timezone "${String(tz)}". Fallback to ${fallback}`);
    return fallback;
}

export type TimeFormat = 'HH:mm' | 'HH:mm:ss' | 'full';

export function formatDateTime(date: Date, displayTz: string, options: { showDate?: boolean; showTimezone?: boolean; format?: TimeFormat } = {}): string {
    const { showDate = false, showTimezone = false, format = 'HH:mm' } = options;
    const dt = DateTime.fromJSDate(date).setZone(displayTz);
    let result = '';
    if (showDate) result += dt.toFormat('yyyy-MM-dd ');
    switch (format) {
        case 'HH:mm:ss':
            result += dt.toFormat('HH:mm:ss');
            break;
        case 'full':
            result += dt.toFormat('yyyy-MM-dd HH:mm:ss');
            break;
        default:
            result += dt.toFormat('HH:mm');
    }
    if (showTimezone) result += ` ${dt.zoneName}`;
    return result;
}

export function getDayOffset(instant: Date, baseDate: string, timezone: string): number {
    const baseDateTime = DateTime.fromISO(baseDate, { zone: timezone });
    const target = DateTime.fromJSDate(instant).setZone(timezone);
    return Math.round(target.startOf('day').diff(baseDateTime.startOf('day'), 'days').days);
}
