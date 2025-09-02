import type { Parent, PhrasingContent, Root } from 'mdast';
import type { Position } from 'unist';

export type RichInline = PhrasingContent[];

export type TimeMarker = 'am' | 'pm';

export interface ITMDEventNode extends Parent {
    type: 'itmdEvent';
    time?: {
        start?: { hh: number | null; mm: number | null; tz?: string | null } | null;
        end?: { hh: number | null; mm: number | null; tz?: string | null } | null;
        startISO?: string | null;
        endISO?: string | null;
        marker?: TimeMarker | null;
    };
    eventType: string;
    title?: RichInline | null;
    destination?: {
        dest?: RichInline | null;
        arr?: RichInline | null;
    } | null;
    meta?: Record<string, string | number | boolean | null | RichInline> | null;
    warnings?: string[];
    children: Parent['children'];
    position?: Position;
    version: '1';
}

export type { Root };
