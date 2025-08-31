export function getTimezoneOptions(): string[] {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Singapore'];
}

export { isValidIanaTimeZone } from '@itinerary-md/core';

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
