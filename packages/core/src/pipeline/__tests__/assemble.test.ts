import type { Parent, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { assembleEvents } from '../assemble';

describe('assemble', () => {
    const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });

    it('blockquote が itmdEvent に置換される（先頭段落がヘッダ）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight IB :: A - B' }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('itmdEvent');
    });

    it('blockquote 内の list をイベントの子として保持（子要素は children に残しつつ body に抽出）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight X :: A - B' }] },
                        { type: 'list', ordered: false, children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: EUR 10' }] }] }] },
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

    it('blockquote の外の段落はそのまま残る', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: '[09:00] activity Walk' }] }],
                },
                { type: 'paragraph', children: [{ type: 'text', value: 'Light city walk to warm up.' }] },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        expect((out.children?.[1] as any).type).toBe('paragraph');
    });

    it('blockquote 内の連続 list から meta を抽出して body へ（リンク保持）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 4, column: 20, offset: 100 } } as any,
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[10:00] museum Visit' }] },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: EUR 12' }] }] },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- note: use audio guide' }] }] },
                            ],
                        },
                        {
                            type: 'list',
                            ordered: false,
                            children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- extra: yes' }] }] }],
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
        // body.kv 抽出（RichInline保持）
        const body = (evt as any).body as Array<any>;
        expect(Array.isArray(body)).toBe(true);
        const metas = body.filter((s) => s?.kind === 'meta');
        expect(metas.length).toBeGreaterThan(0);
        const firstMeta = metas[0];
        const entries = firstMeta.entries as Array<{ key: string; value: PhrasingContent[] }>;
        const get = (k: string) => entries.find((e) => e.key === k)?.value ?? [];
        expect(mdastToString({ type: 'paragraph', children: get('price') } as unknown as Parent)).toBe('EUR 12');
        expect(mdastToString({ type: 'paragraph', children: get('note') } as unknown as Parent)).toBe('use audio guide');
    });

    it('blockquote 内のヘッダ段落が複数行でも、blockquote 外の list は対象外', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                { type: 'text', value: '[06:30] breakfast Traditional Japanese breakfast :: hotel' },
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
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: JPY 1800' }] }] },
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- note: Last taste of Japan before departure' }] }] },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.meta).toBeUndefined();
    });

    it('blockquote 内 list の key: value を body.meta に抽出（順序保持）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] lunch at Cafe' }] },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: EUR 25' }] }] },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- note: hello' }] }] },
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
        expect(mdastToString({ type: 'paragraph', children: get('price') } as unknown as Parent)).toBe('EUR 25');
        expect(mdastToString({ type: 'paragraph', children: get('note') } as unknown as Parent)).toBe('hello');
    });

    it('meta: 先頭の "- key: value" のハイフン/空白は無視して key 化、値はリンク保持', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] lunch at Cafe' }] },
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
                                                { type: 'link', url: 'https://pay.example', title: null, children: [{ type: 'text', value: 'EUR 25' }] },
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

    it('meta: list の段落が無い場合でも listItem 全体テキストから key:value を抽出', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] note something' }] },
                        { type: 'list', ordered: false, children: [{ type: 'listItem', children: [{ type: 'text', value: '- note: plain' }] as any }] },
                    ],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { body?: any };
        const metas = ((evt as any).body as Array<any>).filter((s) => s.kind === 'meta');
        const entries = metas.flatMap((m: any) => m.entries as Array<{ key: string; value: PhrasingContent[] }>);
        const noteV = (entries.find((e) => e.key === 'note')?.value ?? []) as PhrasingContent[];
        expect(mdastToString({ type: 'paragraph', children: noteV } as unknown as Parent)).toBe('plain');
    });

    it('meta: 値にコロンが含まれても先頭のコロンだけを区切りとして扱う', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] info sample' }] },
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
        expect(mdastToString({ type: 'paragraph', children: noteV } as unknown as Parent)).toBe('value: with: colons');
    });

    it('body: 段落→KVリスト→段落→混在リスト（非KV+KV）を順序保持し、非KVは list.items に入る', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight :: Departure - Arrival' }] },
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
                                                { type: 'link', url: 'https://example.com/', title: null, children: [{ type: 'text', value: '50A' }] },
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
                                                { type: 'link', url: 'https://example.com/', title: null, children: [{ type: 'text', value: 'Economy' }] },
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
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'item' }] }] },
                                {
                                    type: 'listItem',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            children: [
                                                { type: 'text', value: '- seat: ' },
                                                { type: 'link', url: 'https://example.com/', title: null, children: [{ type: 'text', value: '50A' }] },
                                            ],
                                        },
                                    ],
                                },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'item' }] }] },
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

        // 期待順序: [meta(seat,class)], inline('ABCDE'), [meta(seat)], list(items=['item','item'])
        const kinds = body.map((s) => s.kind);
        expect(kinds).toContain('meta');
        expect(kinds).toContain('inline');
        expect(kinds).toContain('list');

        // 先頭の meta には seat と class が含まれる
        const firstMeta = body.find((s) => s.kind === 'meta');
        const entries1 = (firstMeta.entries || []) as Array<{ key: string; value: PhrasingContent[] }>;
        const keys1 = entries1.map((e) => e.key).sort();
        expect(keys1).toEqual(['class', 'seat']);
        const seatInline = entries1.find((e) => e.key === 'seat')?.value ?? [];
        expect(mdastToString({ type: 'paragraph', children: seatInline } as unknown as Parent)).toBe('50A');

        // inline 段落 'ABCDE'
        const inlineSeg = body.find((s) => s.kind === 'inline');
        expect(mdastToString({ type: 'paragraph', children: (inlineSeg.content || []) as PhrasingContent[] } as unknown as Parent)).toBe('ABCDE');

        // 後段は list と meta が交互に出るため、list は2つに分割される（各1件）
        const listSegs = body.filter((s) => s.kind === 'list');
        expect(listSegs.length).toBe(2);
        const items0 = (listSegs[0].items || []) as PhrasingContent[][];
        const items1 = (listSegs[1].items || []) as PhrasingContent[][];
        expect(items0.length).toBe(1);
        expect(items1.length).toBe(1);
        expect(mdastToString({ type: 'paragraph', children: items0[0] } as unknown as Parent)).toBe('item');
        expect(mdastToString({ type: 'paragraph', children: items1[0] } as unknown as Parent)).toBe('item');
    });

    it('list: meta と 非KV が交互に並ぶ場合でも出現順を保持する', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[] hotel Casa Fuster :: Gran de Gràcia 132, Barcelona' }] },
                        {
                            type: 'list',
                            ordered: false,
                            children: [
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- meta1: value1' }] }] },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- list item' }] }] },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- meta2: value2' }] }] },
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
        // 期待: meta(meta1) → list(['list item']) → meta(meta2)
        expect(body[0].kind).toBe('meta');
        expect((body[0].entries || []).map((e: any) => e.key)).toEqual(['meta1']);
        expect(body[1].kind).toBe('list');
        expect(mdastToString({ type: 'paragraph', children: body[1].items?.[0] || [] } as unknown as Parent)).toBe('list item');
        expect(body[2].kind).toBe('meta');
        expect((body[2].entries || []).map((e: any) => e.key)).toEqual(['meta2']);
    });

    it('body: ordered list の ordered/start を保持する', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[] note something' }] },
                        {
                            type: 'list',
                            ordered: true,
                            start: 3,
                            children: [
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'first' }] }] },
                                { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'second' }] }] },
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
        expect(mdastToString({ type: 'paragraph', children: items[0] } as unknown as Parent)).toBe('first');
        expect(mdastToString({ type: 'paragraph', children: items[1] } as unknown as Parent)).toBe('second');
    });

    it('meta: 同一キーが連続する場合でも順序通りに複数 entries として保持', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        { type: 'paragraph', children: [{ type: 'text', value: '[06:30] breakfast Traditional Japanese breakfast at hotel' }] },
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
                                                { type: 'link', url: 'https://example.com/', title: null, children: [{ type: 'text', value: '40A' }] },
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
                                                { type: 'link', url: 'https://example.com/', title: null, children: [{ type: 'text', value: '50A' }] },
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
        const entries = (firstMeta.entries || []) as Array<{ key: string; value: PhrasingContent[] }>;
        expect(entries.length).toBe(2);
        expect(entries.map((e) => e.key)).toEqual(['seat', 'seat']);
        expect(mdastToString({ type: 'paragraph', children: entries[0].value } as unknown as Parent)).toBe('40A');
        expect(mdastToString({ type: 'paragraph', children: entries[1].value } as unknown as Parent)).toBe('50A');
    });

    it('ヘッダ段落が複数行でも meta は blockquote 内 list からのみ抽出', () => {
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
                    children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- note: x' }] }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.meta).toBeUndefined();
    });

    it('blockquote の外側にある空行や list は無視される', () => {
        const tree: Root = {
            type: 'root',
            children: [
                { type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '[] flight AA000 from Tokyo to London' }] }] },
                { type: 'paragraph', children: [{ type: 'text', value: '' }] },
                {
                    type: 'list',
                    ordered: false,
                    children: [
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- seat: 50A' }] }] },
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- class: Economy' }] }] },
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

    it('先頭段落内で改行により語が分断されても from/to を正しく抽出', () => {
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
        const toText = mdastToString({ type: 'paragraph', children: d.to } as unknown as Parent);
        expect(toText).toBe('London');
    });

    it('type が無い "[]" だけのときは変換しない（blockquote のまま）', () => {
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

    it('"[] flight" まで入力した時点で itmdEvent へ変換', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: '[] flight' }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as any;
        expect(evt.type).toBe('itmdEvent');
        expect(evt.eventType).toBe('flight');
    });
});
