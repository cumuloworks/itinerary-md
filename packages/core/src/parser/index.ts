import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { remarkItinerary } from '../remark/itinerary';
import type { EventData } from './parsers/event';

export type ItineraryEvent = {
    date: string;
    timezone?: string;
    event: EventData;
    rawText: string;
};

export type ParseItineraryEventsOptions = {
    timezone?: string;
    stayMode?: 'default' | 'header';
};

/**
 * Parse markdown content into structured itinerary events
 */
export function parseItineraryEvents(markdown: string, options?: ParseItineraryEventsOptions): ItineraryEvent[] {
    const events: ItineraryEvent[] = [];

    const processor = unified().use(remarkParse).use(remarkItinerary, {
        timezone: options?.timezone,
        stayMode: options?.stayMode,
    });

    const tree = processor.parse(markdown) as Root;
    const ran = processor.runSync(tree, { value: markdown } as unknown as { value: string }) as Root;

    type Node = { type?: string; data?: { hProperties?: Record<string, unknown> } } & { children?: Node[] };
    const children: Node[] = Array.isArray((ran as unknown as { children?: unknown[] }).children) ? ((ran as unknown as { children?: Node[] }).children as Node[]) : [];

    for (let i = 0; i < children.length; i += 1) {
        const node = children[i];
        if (!node || node.type !== 'paragraph') continue;
        const hProps = (node.data?.hProperties || {}) as Record<string, unknown>;
        if (hProps['data-itin-skip'] === '1') continue;
        const eventStr = typeof hProps['data-itin-event'] === 'string' ? (hProps['data-itin-event'] as string) : undefined;
        if (!eventStr) continue;

        const dateStr = typeof hProps['data-itin-date-str'] === 'string' ? (hProps['data-itin-date-str'] as string) : undefined;
        if (!dateStr) continue;
        const tzStr = typeof hProps['data-itin-date-tz'] === 'string' ? (hProps['data-itin-date-tz'] as string) : undefined;

        try {
            const event = JSON.parse(eventStr) as EventData;
            const rawText = mdastToString(node as unknown as { children?: unknown[] } as never).trim();
            events.push({
                date: dateStr,
                timezone: tzStr,
                event,
                rawText,
            });
        } catch {}
    }

    return events;
}

export { parseDateText } from './parsers/date';
export { type ActivityEventData, type EventData, parseEvent, type StayEventData, type TransportationEventData } from './parsers/event';
export { parseTimeToken, type TimeLike, type TimeRangeLike } from './parsers/time';
