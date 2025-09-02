import type { Services } from '../services';

export type LexTokens = {
    raw: string;
    // future: token stream with offsets
};

export function lexLine(line: string, _ctx: { baseTz?: string }, _sv: Services): LexTokens {
    return { raw: line };
}
