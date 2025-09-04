import { DateTime } from 'luxon';

export type TimeFormat = 'HH:mm' | 'HH:mm:ss' | 'full';

export const formatDateTime = (
    date: Date,
    displayTz: string,
    options: {
        showDate?: boolean;
        showTimezone?: boolean;
        format?: TimeFormat;
    } = {}
): string => {
    const { showDate = false, showTimezone = false, format = 'HH:mm' } = options;
    const dt = DateTime.fromJSDate(date).setZone(displayTz);

    let result = '';
    if (showDate) {
        result += dt.toFormat('yyyy-MM-dd ');
    }

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

    if (showTimezone) {
        result += ` ${dt.zoneName}`;
    }

    return result;
};

export const getDayOffset = (instant: Date, baseDate: string, timezone: string): number => {
    const baseDateTime = DateTime.fromISO(baseDate, { zone: timezone });
    const target = DateTime.fromJSDate(instant).setZone(timezone);
    return Math.round(target.startOf('day').diff(baseDateTime.startOf('day'), 'days').days);
};

export const formatDateWithTimezone = (dateStr: string, timezone?: string, locale: string = 'ja-JP'): string => {
    const isoDate = DateTime.fromISO(dateStr, { zone: 'utc' });
    if (!isoDate.isValid) return dateStr;

    const zoned = timezone ? isoDate.setZone(timezone) : isoDate;
    try {
        return zoned.toJSDate().toLocaleDateString(locale, timezone ? { timeZone: timezone } : undefined);
    } catch {
        return isoDate.toJSDate().toLocaleDateString(locale);
    }
};
