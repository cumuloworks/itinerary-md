import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { type Policy } from '../services';
export type ItmdRemarkOptions = Partial<Policy> & {
    timezone?: string;
    debug?: boolean;
};
export declare const remarkItinerary: Plugin<[ItmdRemarkOptions?], Root>;
//# sourceMappingURL=itinerary.d.ts.map
