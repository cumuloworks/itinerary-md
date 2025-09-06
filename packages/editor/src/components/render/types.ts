import type { PhrasingContent } from 'mdast';

export type MdNode = {
    type?: string;
    depth?: number;
    children?: any[];
    position?: {
        start?: { line?: number; column?: number };
        end?: { line?: number; column?: number };
    };
};

export type RenderBlockContext = {
    getLineStart: (n: { position?: { start?: { line?: number } } } | undefined) => number | undefined;
    getLineEnd: (n: { position?: { end?: { line?: number } } } | undefined) => number | undefined;
    getNodeDateAttr: (n: unknown) => string | undefined;
    displayTimezone: string;
    currency?: string;
    lastStaySegmentsByDate: Map<string, Array<{ text: string; url?: string }>>;
    inlineToSegments: (inline?: PhrasingContent[] | null) => Array<{ text: string; url?: string; kind?: 'text' | 'code' }> | undefined;
    segmentsToPlainText: (segments?: Array<{ text: string; url?: string }>) => string | undefined;
};
