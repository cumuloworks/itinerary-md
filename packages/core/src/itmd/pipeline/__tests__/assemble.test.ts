import type { Root } from 'mdast';
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
        const evt = out.children?.[0] as any;
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
        const evt = out.children?.[0] as any;
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
        const evt = out.children?.[0] as any;
        expect(evt.type).toBe('itmdEvent');
        // list は吸収される（2つとも）
        expect(evt.children?.some((n: any) => n.type === 'list')).toBe(true);
        // position は paragraph の start から最後の list の end まで
        expect(evt.position.start.line).toBe(1);
        expect(evt.position.start.column).toBe(1);
        expect(evt.position.end.line).toBe(4);
        expect(evt.position.end.column).toBe(20);
        // list からは meta 抽出（RichInline保持）
        expect(mdastToString({ type: 'paragraph', children: evt.meta.price } as any)).toBe('EUR 12');
        expect(mdastToString({ type: 'paragraph', children: evt.meta.note } as any)).toBe('use audio guide');
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
        const evt = out.children?.[0] as any;
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
        const evt = out.children?.[0] as any;
        expect(mdastToString({ type: 'paragraph', children: evt.meta.price } as any)).toBe('EUR 25');
        expect(mdastToString({ type: 'paragraph', children: evt.meta.note } as any)).toBe('hello');
    });
});
