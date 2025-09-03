import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { ITMDEventNode } from '../types';

export type ITMDEventDTO = {
    type: string;
    titleText?: string;
};

export function toItineraryEvents(root: Root): ITMDEventDTO[] {
    const out: ITMDEventDTO[] = [];
    visit(root as unknown as { type: string }, 'itmdEvent', (n: ITMDEventNode) => {
        const titleText = Array.isArray(n.title) ? (n.title as PhrasingContent[]).map((t) => (typeof (t as unknown as { value?: unknown }).value === 'string' ? (t as unknown as { value: string }).value : '')).join('') : undefined;
        out.push({ type: n.eventType, titleText });
    });
    return out;
}
