import type { Parent, PhrasingContent, Root } from 'mdast';
import type { Position } from 'unist';

export type RichInline = PhrasingContent[];

export type TimeMarker = 'am' | 'pm';

export type TimePoint = {
    hh: number;
    mm: number;
    tz?: string | null;
    dayOffset?: number | null;
};

export type EventTime =
    | { kind: 'none' }
    | { kind: 'marker'; marker: TimeMarker }
    | { kind: 'point'; start: TimePoint; startISO?: string | null }
    | { kind: 'range'; start: TimePoint; end: TimePoint; startISO?: string | null; endISO?: string | null };

export interface ITMDEventNode extends Parent {
    type: 'itmdEvent';
    time?: EventTime;
    eventType: string;
    title?: RichInline | null;
    destination?:
        | (
              | {
                    kind: 'single';
                    at: RichInline;
                }
              | {
                    kind: 'dashPair';
                    from: RichInline;
                    to: RichInline;
                }
              | {
                    kind: 'fromTo';
                    from: RichInline;
                    to: RichInline;
                }
          )
        | null;
    meta?: Record<string, string | number | boolean | null | RichInline> | null;
    warnings?: string[];
    children: Parent['children'];
    position?: Position;
    version: '1';
}

export type { Root };
