import type { PhrasingContent, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';
import { remarkItinerary } from '../itinerary';

function toItineraryEvents(root: Root): { type: string; titleText?: string }[] {
    const out: { type: string; titleText?: string }[] = [];
    visit(root as unknown as { type: string }, 'itmdEvent', (n: unknown) => {
        const node = n as { eventType: string; title?: PhrasingContent[] | unknown };
        const titleText = Array.isArray(node.title) ? (node.title as PhrasingContent[]).map((t) => (typeof (t as unknown as { value?: unknown }).value === 'string' ? (t as unknown as { value: string }).value : '')).join('') : undefined;
        out.push({ type: node.eventType, titleText });
    });
    return out;
}

describe('run/remark/extract integration', () => {
    it('複数イベントが itmdEvent になり、抽出できる', () => {
        const md = `
## 2025-03-15 @Asia/Tokyo

> [08:00] flight IB :: A - B
>
> - price: EUR 100

> [09:00] lunch at Cafe
`;
        const tree = unified().use(remarkParse).parse(md);
        const ran = unified().use(remarkParse).use(remarkItinerary, {}).runSync(tree);
        const events = toItineraryEvents(ran as unknown as import('mdast').Root);
        expect(events.length).toBeGreaterThan(0);
    });
});
