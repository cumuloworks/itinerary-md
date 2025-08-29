export interface DateData {
    date: string;
    dayOfWeek: string;
    timezone?: string;
    originalText: string;
}

const getDayOfWeekFromDateString = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const year = Number.parseInt(match[1], 10);
    const monthIndex = Number.parseInt(match[2], 10) - 1;
    const day = Number.parseInt(match[3], 10);
    const dow = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    return names[dow];
};

export const parseDateText = (text: string, baseTz?: string): DateData | null => {
    const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})(?:\s*@([A-Za-z0-9_./+-]+))?/);
    if (!dateMatch) return null;
    const [, date, tz] = dateMatch as RegExpMatchArray & { 1: string; 2?: string };
    const dayOfWeek = getDayOfWeekFromDateString(date);
    const timezone = tz || baseTz;
    return { date, dayOfWeek, timezone, originalText: text };
};

export const isValidDate = (dateStr: string): boolean => {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const year = Number.parseInt(m[1], 10);
    const monthIndex = Number.parseInt(m[2], 10) - 1;
    const day = Number.parseInt(m[3], 10);
    const d = new Date(Date.UTC(year, monthIndex, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === monthIndex && d.getUTCDate() === day;
};
