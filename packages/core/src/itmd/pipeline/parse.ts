import type { PhrasingContent } from 'mdast';
import type { Services } from '../services';
import type { LexTokens } from './lex';

export type ParsedHeader = {
    eventType?: string;
    title?: PhrasingContent[] | null;
    destination?: { dest?: PhrasingContent[] | null; arr?: PhrasingContent[] | null } | null;
    time?: {
        start?: { hh: number | null; mm: number | null; tz?: string | null } | null;
        end?: { hh: number | null; mm: number | null; tz?: string | null } | null;
        marker?: 'am' | 'pm' | null;
    } | null;
};

export function parseHeader(tokens: LexTokens, mdInline: PhrasingContent[], _sv: Services): ParsedHeader {
    // minimal placeholder: only extracts eventType word after time bracket, leaves inline as title
    const text = tokens.raw.trim();
    const m = text.match(/^\[(.*?)\]\s+(\w+)/);
    const eventType = m?.[2];
    return { eventType, title: mdInline };
}
