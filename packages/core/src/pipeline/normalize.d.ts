import type { Services } from '../services';
import type { EventTime } from '../types';
import type { ParsedHeader } from './parse';
export type NormalizedHeader = ParsedHeader & {
    time?: EventTime | null;
};
export declare function normalizeHeader(
    h: ParsedHeader,
    ctx: {
        baseTz?: string;
        dateISO?: string;
    },
    sv: Services
): NormalizedHeader;
//# sourceMappingURL=normalize.d.ts.map
