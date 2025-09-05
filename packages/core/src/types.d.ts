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
    | {
          kind: 'none';
      }
    | {
          kind: 'marker';
          marker: TimeMarker;
      }
    | {
          kind: 'point';
          start: TimePoint;
          startISO?: string | null;
      }
    | {
          kind: 'range';
          start: TimePoint;
          end: TimePoint;
          startISO?: string | null;
          endISO?: string | null;
      };
export type TextSlicePosition = {
    start: number;
    end: number;
};
export interface ITMDEventNode extends Parent {
    type: 'itmdEvent';
    time?: EventTime;
    eventType: string;
    baseType?: 'transportation' | 'stay' | 'activity';
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
    body?: ITMDBodySegment[] | null;
    warnings?: string[];
    children: Parent['children'];
    position?: Position;
    positions?: {
        title?: TextSlicePosition;
        destination?: {
            from?: TextSlicePosition;
            to?: TextSlicePosition;
            at?: TextSlicePosition;
        };
        time?: {
            start?: TextSlicePosition;
            end?: TextSlicePosition;
            marker?: TextSlicePosition;
        };
    };
    version: '1';
}
export type ITMDBodySegment =
    | {
          kind: 'inline';
          content: RichInline;
      }
    | {
          kind: 'meta';
          entries: Array<{
              key: string;
              value: RichInline;
          }>;
      }
    | {
          kind: 'list';
          items: RichInline[];
          ordered?: boolean;
          start?: number | null;
      };
export interface ITMDHeadingNode extends Parent {
    type: 'itmdHeading';
    dateISO: string;
    timezone?: string;
    children: Parent['children'];
    position?: Position;
}
export type { Root };
