import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { remarkItineraryAlert } from '../remarkItineraryAlert';

const parse = (md: string): Root => unified().use(remarkParse).parse(md) as unknown as Root;

describe('remarkItineraryAlert', () => {
    it('allows leading spaces before tag and is case-insensitive', async () => {
        const md = '>   [!warning]  lorem';
        const processor = unified()
            .use(remarkParse)
            .use(remarkItineraryAlert as any);
        const tree = (await processor.run(parse(md))) as unknown as Root & { children?: any[] };
        const n = tree.children?.[0] as any;
        expect(n?.type).toBe('itmdAlert');
        expect(n?.variant).toBe('warning');
        expect(n?.inlineTitle?.[0]?.value).toMatch(/lorem/);
    });
    it('converts one-line github alert to itmdAlert with inlineTitle', async () => {
        const md = '> [!WARNING] lorem ipsum';
        const processor = unified()
            .use(remarkParse)
            .use(remarkItineraryAlert as any);
        const tree = (await processor.run(parse(md))) as unknown as Root & { children?: any[] };
        const n = tree.children?.[0] as any;
        expect(n?.type).toBe('itmdAlert');
        expect(n?.variant).toBe('warning');
        expect(n?.title).toBe('WARNING');
        expect(n?.inlineTitle?.[0]?.type).toBe('text');
        expect(n?.inlineTitle?.[0]?.value).toMatch(/lorem ipsum/);
        expect(Array.isArray(n?.children) && n.children.length === 0).toBe(true);
    });

    it('keeps subsequent blockquote paragraphs as children', async () => {
        // Inserting blank lines creates multiple paragraphs inside a blockquote
        const md = '> [!TIP]\n>\n> line1\n>\n> line2';
        const processor = unified()
            .use(remarkParse)
            .use(remarkItineraryAlert as any);
        const tree = (await processor.run(parse(md))) as unknown as Root & { children?: any[] };
        const n = tree.children?.[0] as any;
        expect(n?.type).toBe('itmdAlert');
        expect(n?.variant).toBe('tip');
        expect(Array.isArray(n?.children) && n.children.length).toBe(2);
        expect(n.children[0]?.type).toBe('paragraph');
        // paragraph text content contains lines
        const paraText = (n.children[0]?.children?.[0]?.value as string) || '';
        expect(paraText).toMatch(/line1/);
    });

    it('ignores normal blockquotes', async () => {
        const md = '> Just quote';
        const processor = unified()
            .use(remarkParse)
            .use(remarkItineraryAlert as any);
        const tree = (await processor.run(parse(md))) as unknown as Root & { children?: any[] };
        const n = tree.children?.[0] as any;
        expect(n?.type).not.toBe('itmdAlert');
        expect(n?.type).toBe('blockquote');
    });
});
