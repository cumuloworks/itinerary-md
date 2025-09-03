import type { Parent, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { assembleEvents } from '../assemble';

describe('assemble', () => {
    const sv = makeDefaultServices({ tzFallback: 'Asia/Tokyo' });

    it('paragraph が itmdEvent に置換される', () => {
        const tree: Root = {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight IB :: A - B' }] }],
        } as any;
        const out = assembleEvents(tree, sv);
        expect((out.children?.[0] as any).type).toBe('itmdEvent');
    });

    it('段落直後のリスト1個を吸収', () => {
        const tree: Root = {
            type: 'root',
            children: [
                { type: 'paragraph', children: [{ type: 'text', value: '[08:00] flight X :: A - B' }] },
                { type: 'list', ordered: false, children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: EUR 10' }] }] }] },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        expect(evt.children?.some((n: any) => n.type === 'list')).toBe(true);
    });

    it('直後が paragraph のときは吸収しない（イベントのみ置換）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                { type: 'paragraph', children: [{ type: 'text', value: '[09:00] activity Walk' }] },
                { type: 'paragraph', children: [{ type: 'text', value: 'Light city walk to warm up.' }] },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        // 2番目のノード（paragraph）は残る
        expect((out.children?.[1] as any).type).toBe('paragraph');
    });

    it('直後が list のとき、連続する list を吸収', () => {
        const tree: Root = {
            type: 'root',
            children: [
                { type: 'paragraph', position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 25, offset: 24 } } as any, children: [{ type: 'text', value: '[10:00] museum Visit' }] },
                {
                    type: 'list',
                    ordered: false,
                    position: { start: { line: 2, column: 1, offset: 25 }, end: { line: 3, column: 30, offset: 80 } } as any,
                    children: [
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- price: EUR 12' }] }] },
                        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- note: use audio guide' }] }] },
                    ],
                },
                {
                    type: 'list',
                    ordered: false,
                    position: { start: { line: 4, column: 1, offset: 81 }, end: { line: 4, column: 20, offset: 100 } } as any,
                    children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: '- extra: yes' }] }] }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        // list は吸収される（2つとも）
        expect(evt.children?.some((n: any) => n.type === 'list')).toBe(true);
        // position は paragraph の start から最後の list の end まで
        const pos = evt.position;
        expect(pos).toBeDefined();
        if (!pos) throw new Error('missing position');
        expect(pos.start.line).toBe(1);
        expect(pos.start.column).toBe(1);
        expect(pos.end.line).toBe(4);
        expect(pos.end.column).toBe(20);
        // list からは meta 抽出（RichInline保持）
        expect(evt.meta).toBeDefined();
        const meta = evt.meta as Record<string, PhrasingContent[]>;
        expect(mdastToString({ type: 'paragraph', children: meta.price } as unknown as Parent)).toBe('EUR 12');
        expect(mdastToString({ type: 'paragraph', children: meta.note } as unknown as Parent)).toBe('use audio guide');
    });

    it('直後が paragraph で、その後に list が来ても吸収しない（normal lineケース）', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        { type: 'text', value: '[06:30] breakfast Traditional Japanese breakfast :: hotel' },
                        { type: 'text', value: '\n' },
                        { type: 'text', value: 'normal line' },
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
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        // paragraph は同一段落内の2行目として保持されるため、次のノードは list
        expect((out.children?.[1] as any).type).toBe('list');
        // meta は付与されない
        expect(evt.meta).toBeUndefined();
    });

    it('list の key: value を meta にフラット化', () => {
        const tree: Root = {
            type: 'root',
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
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta: Record<string, PhrasingContent[]> };
        expect(mdastToString({ type: 'paragraph', children: evt.meta.price } as unknown as Parent)).toBe('EUR 25');
        expect(mdastToString({ type: 'paragraph', children: evt.meta.note } as unknown as Parent)).toBe('hello');
    });

    it('meta: 先頭の "- key: value" のハイフン/空白は無視して key 化、値はリンク保持', () => {
        const tree: Root = {
            type: 'root',
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
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta: Record<string, PhrasingContent[]> };
        expect(evt.meta).toBeDefined();
        const priceInline = evt.meta.price as PhrasingContent[];
        const isLink = (n: PhrasingContent): n is import('mdast').Link => (n as unknown as { type?: string }).type === 'link';
        expect(priceInline.some((n) => isLink(n) && n.url === 'https://pay.example')).toBe(true);
    });

    it('meta: list の段落が無い場合でも listItem 全体テキストから key:value を抽出', () => {
        const tree: Root = {
            type: 'root',
            children: [
                { type: 'paragraph', children: [{ type: 'text', value: '[08:00] note something' }] },
                {
                    type: 'list',
                    ordered: false,
                    children: [{ type: 'listItem', children: [{ type: 'text', value: '- note: plain' }] as any }],
                },
            ],
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta: Record<string, PhrasingContent[]> };
        expect(evt.meta).toBeDefined();
        expect(mdastToString({ type: 'paragraph', children: evt.meta.note } as unknown as Parent)).toBe('plain');
    });

    it('meta: 値にコロンが含まれても先頭のコロンだけを区切りとして扱う', () => {
        const tree: Root = {
            type: 'root',
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
        } as any;
        const out = assembleEvents(tree, sv);
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta: Record<string, PhrasingContent[]> };
        expect(mdastToString({ type: 'paragraph', children: evt.meta.note } as unknown as Parent)).toBe('value: with: colons');
    });

    it('吸収条件: 段落2行目が存在する場合は list を吸収しない', () => {
        const tree: Root = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        { type: 'text', value: '[07:00] breakfast' },
                        { type: 'text', value: '\n' },
                        { type: 'text', value: 'second line exists' },
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
        const evt = out.children?.[0] as unknown as Parent & { type: string } & { meta?: Record<string, PhrasingContent[]> };
        expect(evt.type).toBe('itmdEvent');
        // list は吸収されない
        expect((out.children?.[1] as any).type).toBe('list');
        expect(evt.meta).toBeUndefined();
    });
});
