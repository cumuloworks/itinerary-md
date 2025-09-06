import type { Parent, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { assembleEvents } from '../assemble';

function h(depth: number, text: string): any {
    return {
        type: 'heading',
        depth,
        children: [{ type: 'text', value: text }],
        position: { start: { line: 1 }, end: { line: 1 } },
    };
}

function bqPara(text: string): any {
    return {
        type: 'blockquote',
        position: { start: { line: 2 }, end: { line: 4 } },
        children: [
            {
                type: 'paragraph',
                children: [{ type: 'text', value: text }],
            },
        ],
    };
}

describe('assembleEvents - date context and data-itmd-date attachment', () => {
    it('sets context on H2 date, attaches data-itmd-date to all nodes, resets on H1', () => {
        const root: Root = {
            type: 'root',
            children: [
                h(2, '2024-01-01'),
                {
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'After date' }],
                } as any,
                bqPara('Just quote under dated section'),
                h(1, 'Top Section'), // reset context here
                {
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'No date context' }],
                } as any,
            ] as any,
        };

        const sv = makeDefaultServices({ defaultTimezone: 'UTC' });
        const out = assembleEvents(root, sv);
        const c = out.children as any[];

        // H2 converted to itmdHeading with data-itmd-date
        expect(c[0]?.type).toBe('itmdHeading');
        expect(c[0]?.data?.hProperties?.['data-itmd-date']).toBe('2024-01-01');

        // Following paragraph received data-itmd-date
        expect(c[1]?.data?.hProperties?.['data-itmd-date']).toBe('2024-01-01');

        // Blockquote keeps type and also has data-itmd-date
        expect(c[2]?.type).toBe('blockquote');
        expect(c[2]?.data?.hProperties?.['data-itmd-date']).toBe('2024-01-01');

        // After H1 reset, subsequent nodes no longer carry data-itmd-date
        expect(c[3]?.type).toBe('heading');
        expect(c[3]?.depth).toBe(1);
        expect(c[4]?.data?.hProperties?.['data-itmd-date']).toBeUndefined();
    });

    it('when blockquote converts to itmdEvent, it also inherits data-itmd-date', () => {
        const root: Root = {
            type: 'root',
            children: [h(2, '2024-01-02'), bqPara('[08:30] flight AA100 :: A - B')] as any,
        };
        const sv = makeDefaultServices({ defaultTimezone: 'UTC' });
        const out = assembleEvents(root, sv);
        const c = out.children as any[];
        expect(c[0]?.type).toBe('itmdHeading');
        expect(c[1]?.type).toBe('itmdEvent');
        expect(c[1]?.data?.hProperties?.['data-itmd-date']).toBe('2024-01-02');
    });
});

// ...

describe('assemble', () => {
    const sv = makeDefaultServices({ defaultTimezone: 'Asia/Tokyo' });

    it('replaces blockquote with itmdEvent (first paragraph is header)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] flight IB :: A - B' }],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('itmdEvent');
    });

    it('keeps list inside blockquote as event children (remain in children and extracted into body)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] flight X :: A - B' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- price: EUR 10' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.children?.some((n: any) => n.type === 'list')).toBe(true);
        expect(Array.isArray((evt as any).body)).toBe(true);
    });

    it('keeps paragraphs outside blockquote as is', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[09:00] activity Walk' }],
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'Light city walk to warm up.' }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & {
            meta?: Record<string, PhrasingContent[]>;
        };
        expect(evt.type).toBe('itmdEvent');
        expect((out.children?.[1] as any).type).toBe('paragraph');
    });

    it('extracts meta from consecutive lists inside blockquote into body (preserve links)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    position: {
                        start: { line: 1, column: 1, offset: 0 },
                        end: { line: 4, column: 20, offset: 100 },
                    } as any,
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[10:00] museum Visit' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- price: EUR 12' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- note: use audio guide' }],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- extra: yes' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        const pos = evt.position;
        expect(pos).toBeDefined();
        // Extract body.kv (keep RichInline)
        const body = (evt as any).body as Array<any>;
        expect(Array.isArray(body)).toBe(true);
        const metas = body.filter((s) => s?.kind === 'meta');
        expect(metas.length).toBeGreaterThan(0);
        const firstMeta = metas[0];
        const entries = firstMeta.entries as Array<{
            key: string;
            value: PhrasingContent[];
        }>;
        const get = (k: string) => entries.find((e) => e.key === k)?.value ?? [];
        expect(
            mdastToString({
                type: 'paragraph',
                children: get('price'),
            } as unknown as Parent)
        ).toBe('EUR 12');
        expect(
            mdastToString({
                type: 'paragraph',
                children: get('note'),
            } as unknown as Parent)
        ).toBe('use audio guide');
    });

    it('normalizes meta price/cost and stores into node.data.itmdPrice (currency and amount only)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] lunch at Cafe' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- price: EUR 25' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- cost: $ 10.50' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as any;
        const prices = (evt.data?.itmdPrice || []) as Array<{
            key: string;
            raw: string;
            price: any;
        }>;
        expect(prices.length).toBe(2);
        const p1 = prices.find((p) => p.key === 'price');
        const p2 = prices.find((p) => p.key === 'cost');
        expect(p1?.price?.tokens?.[0]?.kind).toBe('money');
        expect(p1?.price?.tokens?.[0]?.normalized?.currency).toBe('EUR');
        expect(p1?.price?.tokens?.[0]?.normalized?.amount).toBe('25');
        expect(p2?.price?.tokens?.[0]?.normalized?.currency).toBe('USD');
        expect(p2?.price?.tokens?.[0]?.normalized?.amount).toBe('10.5');
    });

    it('for multi-line header within blockquote, lists outside blockquote are excluded', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[06:30] breakfast Traditional Japanese breakfast :: hotel',
                                },
                                { type: 'text', value: '\n' },
                                { type: 'text', value: 'normal line' },
                            ],
                        },
                    ],
                },
                {
                    type: 'list',
                    ordered: false,
                    children: [
                        {
                            type: 'listItem',
                            children: [
                                {
                                    type: 'paragraph',
                                    children: [{ type: 'text', value: '- price: JPY 1800' }],
                                },
                            ],
                        },
                        {
                            type: 'listItem',
                            children: [
                                {
                                    type: 'paragraph',
                                    children: [
                                        {
                                            type: 'text',
                                            value: '- note: Last taste of Japan before departure',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & {
            meta?: Record<string, PhrasingContent[]>;
        };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.meta).toBeUndefined();
    });

    it('extracts key: value from lists inside blockquote into body.meta (order preserved)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] lunch at Cafe' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- price: EUR 25' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- note: hello' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        const metas = ((evt as any).body as Array<any>).filter((s) => s.kind === 'meta');
        const entries = metas.flatMap((m: any) => m.entries as Array<{ key: string; value: PhrasingContent[] }>);
        const get = (k: string) => entries.find((e) => e.key === k)?.value ?? [];
        expect(
            mdastToString({
                type: 'paragraph',
                children: get('price'),
            } as unknown as Parent)
        ).toBe('EUR 25');
        expect(
            mdastToString({
                type: 'paragraph',
                children: get('note'),
            } as unknown as Parent)
        ).toBe('hello');
    });

    it('meta: ignore leading "- key: value" hyphen/space when keying; preserve links in value', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] lunch at Cafe' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- price: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://pay.example',
                                                    title: null,
                                                    children: [{ type: 'text', value: 'EUR 25' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        const metas = ((evt as any).body as Array<any>).filter((s) => s.kind === 'meta');
        const entries = metas.flatMap((m: any) => m.entries as Array<{ key: string; value: PhrasingContent[] }>);
        const priceInline = (entries.find((e) => e.key === 'price')?.value ?? []) as PhrasingContent[];
        const isLink = (n: PhrasingContent): n is import('mdast').Link => (n as unknown as { type?: string }).type === 'link';
        expect(priceInline.some((n) => isLink(n) && n.url === 'https://pay.example')).toBe(true);
    });

    it('meta: extract key:value from entire listItem text even without paragraph', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] note something' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [{ type: 'text', value: '- note: plain' }] as any,
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        const metas = ((evt as any).body as Array<any>).filter((s) => s.kind === 'meta');
        const entries = metas.flatMap((m: any) => m.entries as Array<{ key: string; value: PhrasingContent[] }>);
        const noteV = (entries.find((e) => e.key === 'note')?.value ?? []) as PhrasingContent[];
        expect(
            mdastToString({
                type: 'paragraph',
                children: noteV,
            } as unknown as Parent)
        ).toBe('plain');
    });

    it('meta: treat only the first colon as separator even if value contains colons', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[08:00] info sample' }],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- note: value: with: colons' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        const metas = ((evt as any).body as Array<any>).filter((s) => s.kind === 'meta');
        const entries = metas.flatMap((m: any) => m.entries as Array<{ key: string; value: PhrasingContent[] }>);
        const noteV = (entries.find((e) => e.key === 'note')?.value ?? []) as PhrasingContent[];
        expect(
            mdastToString({
                type: 'paragraph',
                children: noteV,
            } as unknown as Parent)
        ).toBe('value: with: colons');
    });

    it('body: preserve order paragraph → KV list → paragraph → mixed list (non-KV + KV); put non-KV into list.items', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[08:00] flight :: Departure - Arrival',
                                },
                            ],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- seat: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://example.com/',
                                                    title: null,
                                                    children: [{ type: 'text', value: '50A' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- class: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://example.com/',
                                                    title: null,
                                                    children: [{ type: 'text', value: 'Economy' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        { type: 'paragraph', children: [{ type: 'text', value: 'ABCDE' }] },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: 'item' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- seat: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://example.com/',
                                                    title: null,
                                                    children: [{ type: 'text', value: '50A' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: 'item' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        const body = (evt as any).body as Array<any>;
        expect(Array.isArray(body)).toBe(true);

        // Expected order: [meta(seat,class)], inline('ABCDE'), [meta(seat)], list(items=['item','item'])
        const kinds = body.map((s) => s.kind);
        expect(kinds).toContain('meta');
        expect(kinds).toContain('inline');
        expect(kinds).toContain('list');

        // The first meta includes seat and class
        const firstMeta = body.find((s) => s.kind === 'meta');
        const entries1 = (firstMeta.entries || []) as Array<{
            key: string;
            value: PhrasingContent[];
        }>;
        const keys1 = entries1.map((e) => e.key).sort();
        expect(keys1).toEqual(['class', 'seat']);
        const seatInline = entries1.find((e) => e.key === 'seat')?.value ?? [];
        expect(
            mdastToString({
                type: 'paragraph',
                children: seatInline,
            } as unknown as Parent)
        ).toBe('50A');

        // Inline paragraph 'ABCDE'
        const inlineSeg = body.find((s) => s.kind === 'inline');
        expect(
            mdastToString({
                type: 'paragraph',
                children: (inlineSeg.content || []) as PhrasingContent[],
            } as unknown as Parent)
        ).toBe('ABCDE');

        // Since list and meta alternate later, the list splits into two (one item each)
        const listSegs = body.filter((s) => s.kind === 'list');
        expect(listSegs.length).toBe(2);
        const items0 = (listSegs[0].items || []) as PhrasingContent[][];
        const items1 = (listSegs[1].items || []) as PhrasingContent[][];
        expect(items0.length).toBe(1);
        expect(items1.length).toBe(1);
        expect(
            mdastToString({
                type: 'paragraph',
                children: items0[0],
            } as unknown as Parent)
        ).toBe('item');
        expect(
            mdastToString({
                type: 'paragraph',
                children: items1[0],
            } as unknown as Parent)
        ).toBe('item');
    });

    it('list: preserve appearance order even when meta and non-KV alternate', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[] hotel Casa Fuster :: Gran de Gràcia 132, Barcelona',
                                },
                            ],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- meta1: value1' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- list item' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: '- meta2: value2' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        const body = (evt as any).body as Array<any>;
        // Expectation: meta(meta1) → list(['list item']) → meta(meta2)
        expect(body[0].kind).toBe('meta');
        expect((body[0].entries || []).map((e: any) => e.key)).toEqual(['meta1']);
        expect(body[1].kind).toBe('list');
        expect(
            mdastToString({
                type: 'paragraph',
                children: body[1].items?.[0] || [],
            } as unknown as Parent)
        ).toBe('list item');
        expect(body[2].kind).toBe('meta');
        expect((body[2].entries || []).map((e: any) => e.key)).toEqual(['meta2']);
    });

    it('body: retain ordered/start on ordered list', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[] note something' }],
                        },
                        {
                            type: 'list',
                            ordered: true,
                            start: 3,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: 'first' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [{ type: 'text', value: 'second' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        const body = (evt as any).body as Array<any>;
        const listSeg = body.find((s) => s.kind === 'list');
        expect(listSeg).toBeDefined();
        expect(Boolean(listSeg.ordered)).toBe(true);
        expect(listSeg.start).toBe(3);
        const items = (listSeg.items || []) as PhrasingContent[][];
        expect(items.length).toBe(2);
        expect(
            mdastToString({
                type: 'paragraph',
                children: items[0],
            } as unknown as Parent)
        ).toBe('first');
        expect(
            mdastToString({
                type: 'paragraph',
                children: items[1],
            } as unknown as Parent)
        ).toBe('second');
    });

    it('meta: preserve duplicates of the same key as multiple entries in order', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[06:30] breakfast Traditional Japanese breakfast at hotel',
                                },
                            ],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- seat: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://example.com/',
                                                    title: null,
                                                    children: [{ type: 'text', value: '40A' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- seat: ' },
                                                {
                                                    type: 'link',
                                                    url: 'https://example.com/',
                                                    title: null,
                                                    children: [{ type: 'text', value: '50A' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        expect(evt.type).toBe('itmdEvent');
        const body = (evt as any).body as Array<any>;
        const firstMeta = body.find((s) => s.kind === 'meta');
        const entries = (firstMeta.entries || []) as Array<{
            key: string;
            value: PhrasingContent[];
        }>;
        expect(entries.length).toBe(2);
        expect(entries.map((e) => e.key)).toEqual(['seat', 'seat']);
        expect(
            mdastToString({
                type: 'paragraph',
                children: entries[0].value,
            } as unknown as Parent)
        ).toBe('40A');
        expect(
            mdastToString({
                type: 'paragraph',
                children: entries[1].value,
            } as unknown as Parent)
        ).toBe('50A');
    });

    it('even if header paragraph spans multiple lines, meta is extracted only from lists inside blockquote', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                { type: 'text', value: '[07:00] breakfast' },
                                { type: 'text', value: '\n' },
                                { type: 'text', value: 'second line exists' },
                            ],
                        },
                    ],
                },
                {
                    type: 'list',
                    ordered: false,
                    children: [
                        {
                            type: 'listItem',
                            children: [
                                {
                                    type: 'paragraph',
                                    children: [{ type: 'text', value: '- note: x' }],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & {
            meta?: Record<string, PhrasingContent[]>;
        };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.meta).toBeUndefined();
    });

    it('ignores blank lines or lists outside the blockquote', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[] flight AA000 from Tokyo to London' }],
                        },
                    ],
                },
                { type: 'paragraph', children: [{ type: 'text', value: '' }] },
                {
                    type: 'list',
                    ordered: false,
                    children: [
                        {
                            type: 'listItem',
                            children: [
                                {
                                    type: 'paragraph',
                                    children: [{ type: 'text', value: '- seat: 50A' }],
                                },
                            ],
                        },
                        {
                            type: 'listItem',
                            children: [
                                {
                                    type: 'paragraph',
                                    children: [{ type: 'text', value: '- class: Economy' }],
                                },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string };
        expect(evt.type).toBe('itmdEvent');
        expect((out.children?.[1] as any).type).toBe('paragraph');
        expect((out.children?.[2] as any).type).toBe('list');
    });

    it('extracts from/to correctly even if words are split by newline in header paragraph', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                { type: 'text', value: '[] flight AA000 from Tokyo to Lon' },
                                { type: 'text', value: '\n' },
                                { type: 'text', value: 'don' },
                            ],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as any;
        expect(evt.type).toBe('itmdEvent');
        expect(evt.destination?.kind).toBe('fromTo');
        const d = evt.destination;
        const toText = mdastToString({
            type: 'paragraph',
            children: d.to,
        } as unknown as Parent);
        expect(toText).toBe('London');
    });

    it('does not convert when only "[]" without type (keep as blockquote)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: '[]' }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('blockquote');
    });

    it('does not convert admonitions like [!NOTE] (keep as blockquote)', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[!NOTE] test' }],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('blockquote');
    });

    it("does not convert when only '[' (keep as blockquote)", () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: '[' }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('blockquote');
    });

    it('converts to itmdEvent when input reaches "[] flight"', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '[] flight' }],
                        },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as any;
        expect(evt.type).toBe('itmdEvent');
        expect(evt.eventType).toBe('flight');
    });
});
