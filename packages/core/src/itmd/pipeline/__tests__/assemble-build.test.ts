import type { Root } from 'mdast';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { assembleEvents } from '../assemble';

describe('assemble/build', () => {
    const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });
    it('paragraph が itmdEvent に置換される', () => {
        const tree: Root = {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight IB :: A - B' }] }],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('itmdEvent');
    });
});
