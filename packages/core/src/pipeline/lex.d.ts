import type { Services } from '../services';
export type LexTokens = {
    raw: string;
    shadow: string;
    map: (shadowIdx: number) => number;
    seps: Array<{
        kind: 'doublecolon' | 'at' | 'routeDash' | 'from' | 'to';
        index: number;
    }>;
};
export declare function lexLine(
    line: string,
    _ctx: {
        baseTz?: string;
    },
    _sv: Services
): LexTokens;
