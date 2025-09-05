import type { PhrasingContent } from 'mdast';
import type { Services } from '../services';
import type { EventTime } from '../types';
import type { LexTokens } from './lex';
export type ParsedHeader = {
    eventType?: string;
    title?: PhrasingContent[] | null;
    destination?:
        | (
              | {
                    kind: 'single';
                    at: PhrasingContent[];
                }
              | {
                    kind: 'dashPair';
                    from: PhrasingContent[];
                    to: PhrasingContent[];
                }
              | {
                    kind: 'fromTo';
                    from: PhrasingContent[];
                    to: PhrasingContent[];
                }
          )
        | null;
    time?: EventTime | null;
    positions?: {
        title?: {
            start: number;
            end: number;
        };
        destination?: {
            from?: {
                start: number;
                end: number;
            };
            to?: {
                start: number;
                end: number;
            };
            at?: {
                start: number;
                end: number;
            };
        };
        time?: {
            start?: {
                start: number;
                end: number;
            };
            end?: {
                start: number;
                end: number;
            };
            marker?: {
                start: number;
                end: number;
            };
        };
    };
};
type TimeSpan = ParsedHeader['time'];
export declare function parseTimeSpan(line: string):
    | {
          time: TimeSpan;
          consumed: number;
      }
    | {
          time: null;
          consumed: 0;
      };
export declare function parseHeader(tokens: LexTokens, mdInline: PhrasingContent[], _sv: Services): ParsedHeader;
//# sourceMappingURL=parse.d.ts.map
