import { DateTime } from 'luxon';

export function flattenSegmentsText(segments?: Array<{ text: string; url?: string }>): string {
    if (!Array.isArray(segments)) return '';
    return segments.map((s) => s.text).join(' ');
}

export function formatDestinationToString(
    dest:
        | { kind: 'fromTo'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
        | { kind: 'dashPair'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
        | { kind: 'single'; at: Array<{ text: string; url?: string }> }
        | undefined
): string {
    if (!dest) return '';
    if (dest.kind === 'fromTo' || dest.kind === 'dashPair') {
        const fromText = flattenSegmentsText(dest.from);
        const toText = flattenSegmentsText(dest.to);
        if (fromText && toText) return `${fromText} → ${toText}`;
        return fromText || toText || '';
    }
    if (dest.kind === 'single') {
        return flattenSegmentsText(dest.at);
    }
    return '';
}

export function formatGoogleDate(dt: DateTime | null): string | null {
    if (!dt) return null;
    return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

export function buildGoogleCalendarUrl(params: { title: string; start: DateTime | null; end: DateTime | null; location?: string; details?: string }): string {
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const q: string[] = [];
    if (params.title) q.push(`text=${encodeURIComponent(params.title)}`);
    const startStr = formatGoogleDate(params.start);
    const endStr = formatGoogleDate(params.end);
    if (startStr && endStr) q.push(`dates=${startStr}%2F${endStr}`);
    else if (startStr) q.push(`dates=${startStr}`);
    if (params.location) q.push(`location=${encodeURIComponent(params.location)}`);
    if (params.details) q.push(`details=${encodeURIComponent(params.details)}`);
    return `${base}&${q.join('&')}`;
}

export function buildOutlookCalendarUrl(params: { title: string; start: DateTime | null; end: DateTime | null; location?: string; details?: string }): string {
    const base = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const q: string[] = ['path=%2Fcalendar%2Faction%2Fcompose', 'rru=addevent'];
    if (params.title) q.push(`subject=${encodeURIComponent(params.title)}`);
    if (params.start) q.push(`startdt=${encodeURIComponent(params.start.toISO({ suppressSeconds: true, includeOffset: true }) || '')}`);
    if (params.end) q.push(`enddt=${encodeURIComponent(params.end.toISO({ suppressSeconds: true, includeOffset: true }) || '')}`);
    if (params.location) q.push(`location=${encodeURIComponent(params.location)}`);
    if (params.details) q.push(`body=${encodeURIComponent(params.details)}`);
    return `${base}?${q.join('&')}`;
}

export function formatICSDate(dt: DateTime | null): string | null {
    if (!dt) return null;
    return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

export function buildICS(params: { title: string; start: DateTime | null; end: DateTime | null; location?: string; description?: string }): string {
    const dtStart = formatICSDate(params.start) || '';
    const dtEnd = formatICSDate(params.end) || '';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//itinerary-md//event//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${(globalThis as any)?.crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : Date.now()}@itinerary-md`,
        `DTSTAMP:${DateTime.utc().toFormat("yyyyLLdd'T'HHmmss'Z'")}`,
        dtStart ? `DTSTART:${dtStart}` : '',
        dtEnd ? `DTEND:${dtEnd}` : '',
        `SUMMARY:${(params.title || '').replace(/\n/g, ' ')}`,
        params.location ? `LOCATION:${params.location.replace(/\n/g, ' ')}` : '',
        params.description ? `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean);
    return lines.join('\r\n');
}
