import { DateTime } from 'luxon';
import { isValidIanaTimeZone } from '../../time/iana';

export type TimeToken = { kind: 'clock'; hour: number; minute: number; tz?: string; dayOffset?: number; originalText: string } | { kind: 'ampm'; value: 'am' | 'pm'; originalText: string };

export type TimeLike = { kind: 'resolved'; epochMs: number; zone: string; original: TimeToken } | { kind: 'placeholder'; value: 'am' | 'pm'; original: TimeToken };

export type TimeRangeLike = { start?: TimeLike; end?: TimeLike; originalText: string };

export const parseTimeToken = (timeStr: string): TimeToken | undefined => {
    if (!timeStr) return undefined;
    const ampmMatch = timeStr.match(/^(am|pm)$/i);
    if (ampmMatch) return { kind: 'ampm', value: ampmMatch[1].toLowerCase() as 'am' | 'pm', originalText: timeStr };

    const tzMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?:\+(\d+))?@([A-Za-z0-9_./+-]+)$/);
    if (tzMatch) {
        const [, hours, minutes, plusDays, timezone] = tzMatch;
        return {
            kind: 'clock',
            hour: Number.parseInt(hours, 10),
            minute: Number.parseInt(minutes, 10),
            tz: timezone,
            dayOffset: plusDays ? Number.parseInt(plusDays, 10) : undefined,
            originalText: timeStr,
        };
    }
    const offsetMatch = timeStr.match(/^(\d{1,2}):(\d{2})\+(\d+)$/);
    if (offsetMatch) {
        const [, hours, minutes, plusDays] = offsetMatch;
        return {
            kind: 'clock',
            hour: Number.parseInt(hours, 10),
            minute: Number.parseInt(minutes, 10),
            dayOffset: Number.parseInt(plusDays, 10),
            originalText: timeStr,
        };
    }
    const normalMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (normalMatch) {
        const [, hours, minutes] = normalMatch;
        return { kind: 'clock', hour: Number.parseInt(hours, 10), minute: Number.parseInt(minutes, 10), originalText: timeStr };
    }
    return undefined;
};

export const parseTimeRangeTokens = (timeRangeText: string): { start?: TimeToken; end?: TimeToken; originalText: string } | undefined => {
    const rangeMatch = timeRangeText.match(/^\[(.*?)\]\s*-\s*\[(.*?)\]$/);
    if (rangeMatch) {
        const [, startStr, endStr] = rangeMatch;
        const start = startStr ? parseTimeToken(startStr) : undefined;
        const end = endStr ? parseTimeToken(endStr) : undefined;
        return { start, end, originalText: timeRangeText };
    }
    const singleMatch = timeRangeText.match(/^\[(.*?)\]$/);
    if (singleMatch) {
        const [, timeStr] = singleMatch;
        const start = timeStr ? parseTimeToken(timeStr) : undefined;
        return { start, end: undefined, originalText: timeRangeText };
    }
    return undefined;
};

export const resolveTimeToken = (token: TimeToken, timezone: string, baseDate?: string): TimeLike => {
    if (token.kind === 'ampm') return { kind: 'placeholder', value: token.value, original: token };
    const dateStr = (baseDate || DateTime.now().toFormat('yyyy-MM-dd')) as string;
    const zone = token.tz && isValidIanaTimeZone(token.tz) ? token.tz : timezone;
    let dt = DateTime.fromISO(`${dateStr}T${String(token.hour).padStart(2, '0')}:${String(token.minute).padStart(2, '0')}`, { zone });
    if (token.dayOffset) dt = dt.plus({ days: token.dayOffset });
    return { kind: 'resolved', epochMs: dt.toMillis(), zone, original: token };
};

export const resolveTimeRange = (rangeTokens: { start?: TimeToken; end?: TimeToken; originalText: string }, timezone: string, baseDate?: string): TimeRangeLike => {
    const start = rangeTokens.start ? resolveTimeToken(rangeTokens.start, timezone, baseDate) : undefined;
    const end = rangeTokens.end ? resolveTimeToken(rangeTokens.end, timezone, baseDate) : undefined;
    return { start, end, originalText: rangeTokens.originalText };
};
