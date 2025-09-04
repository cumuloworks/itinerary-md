import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { toItineraryEvents } from '../../extract';
import { remarkItinerary } from '../itinerary';

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
