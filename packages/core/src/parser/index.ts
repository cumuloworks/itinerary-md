import { parseDateText } from './parsers/date';
import { type EventData, parseEvent } from './parsers/event';

export type ItineraryEvent = {
    date: string;
    timezone?: string;
    event: EventData;
    rawText: string;
};

export type ParseItineraryEventsOptions = {
    baseTz?: string;
    stayMode?: 'default' | 'header';
};

/**
 * Parse markdown content into structured itinerary events
 */
export function parseItineraryEvents(markdown: string, options?: ParseItineraryEventsOptions): ItineraryEvent[] {
    const events: ItineraryEvent[] = [];
    const lines = markdown.split(/\r?\n/);

    let currentDate: string | undefined;
    let currentTimezone: string | undefined;
    let previousEvent: EventData | null = null;

    const knownKeys = new Set(['cost', 'price', 'seat', 'room', 'guests', 'aircraft', 'vehicle', 'location', 'addr', 'phone', 'wifi', 'rating', 'reservation', 'checkin', 'checkout', 'tag', 'cuisine', 'note', 'desc', 'text']);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('## ')) {
            const dateText = trimmedLine.slice(3).trim();
            const dateData = parseDateText(dateText, options?.baseTz);
            if (dateData) {
                currentDate = dateData.date;
                currentTimezone = dateData.timezone;
                previousEvent = null;
            }
            continue;
        }

        if (!trimmedLine || !currentDate) continue;

        const eventData = parseEvent(trimmedLine, previousEvent || undefined, options?.baseTz, currentDate);
        if (eventData) {
            const metadata: Record<string, string> = { ...eventData.metadata };
            let j = i + 1;

            while (j < lines.length && lines[j].trim() === '') {
                j++;
            }

            while (j < lines.length) {
                const metaLine = lines[j].trim();
                if (!metaLine.startsWith('- ') && !metaLine.startsWith('* ')) {
                    break;
                }

                const itemText = metaLine.substring(2).trim();
                const colonIndex = itemText.indexOf(':');
                if (colonIndex > 0) {
                    const key = itemText.substring(0, colonIndex).trim().toLowerCase();
                    const value = itemText.substring(colonIndex + 1).trim();
                    if (knownKeys.has(key)) {
                        metadata[key] = value;
                    }
                }
                j++;
            }

            const finalEventData: EventData = {
                ...eventData,
                metadata,
            };

            events.push({
                date: currentDate,
                timezone: currentTimezone,
                event: finalEventData,
                rawText: trimmedLine,
            });
            previousEvent = finalEventData;

            i = j - 1;
        }
    }

    return events;
}

export { parseDateText } from './parsers/date';
export { type ActivityEventData, type EventData, extractAirlineCode, parseEvent, type StayEventData, type TransportationEventData } from './parsers/event';
export { parseTimeToken, type TimeLike, type TimeRangeLike } from './parsers/time';
