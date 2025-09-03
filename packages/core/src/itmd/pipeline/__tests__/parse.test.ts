import { toString as mdastToString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { lexLine } from '../lex';
import { parseHeader } from '../parse';

describe('parseHeader', () => {
    const sv = makeDefaultServices({});
    it('[08:00] flight ... を eventType 抽出', () => {
        const tokens = lexLine('[08:00] flight IB6800 :: NRT - MAD', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.eventType).toBe('flight');
    });

    it('destination: :: による single at（title は type を除外して算出、今回は null）', () => {
        const tokens = lexLine('[08:00] lunch :: Cafe Luna', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('single');
        expect(header.title).toBeNull();
        const at = (header.destination as any).at;
        expect(mdastToString({ type: 'paragraph', children: at } as any)).toContain('Cafe Luna');
    });

    it('destination: A - B による dashPair', () => {
        const tokens = lexLine('[08:00] flight IB :: NRT - MAD', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('dashPair');
        expect(mdastToString({ type: 'paragraph', children: header.title ?? [] } as any)).toContain('IB');
        const d = header.destination as Extract<typeof header.destination, { kind: 'dashPair' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as any)).toBe('NRT');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as any)).toBe('MAD');
    });

    it('リンク保持: single(::) の at にリンクが残る', () => {
        const line = '[08:00] lunch :: Visit Cafe';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[08:00] lunch :: Visit ' },
            { type: 'link', url: 'https://cafe.example', title: null, children: [{ type: 'text', value: 'Cafe' }] },
        ] as any;
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('single');
        const at = (header.destination as any).at as any[];
        expect(at.some((n) => n.type === 'link' && n.url === 'https://cafe.example')).toBe(true);
    });

    it('リンク保持: dashPair の from/to にリンクが残る', () => {
        const line = '[08:00] flight :: NRT - MAD';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[08:00] flight :: ' },
            { type: 'link', url: 'https://a.example', title: null, children: [{ type: 'text', value: 'NRT' }] },
            { type: 'text', value: ' - ' },
            { type: 'link', url: 'https://b.example', title: null, children: [{ type: 'text', value: 'MAD' }] },
        ] as any;
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('dashPair');
        const d = header.destination as Extract<typeof header.destination, { kind: 'dashPair' }>;
        expect((d.from as any[]).some((n) => n.type === 'link' && n.url === 'https://a.example')).toBe(true);
        expect((d.to as any[]).some((n) => n.type === 'link' && n.url === 'https://b.example')).toBe(true);
    });

    it('リンク保持: fromTo の from/to にリンクが残る', () => {
        const line = '[am] flight JL from Tokyo to London';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[am] flight JL from ' },
            { type: 'link', url: 'https://tokyo.example', title: null, children: [{ type: 'text', value: 'Tokyo' }] },
            { type: 'text', value: ' to ' },
            { type: 'link', url: 'https://london.example', title: null, children: [{ type: 'text', value: 'London' }] },
        ] as any;
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('fromTo');
        const d = header.destination as Extract<typeof header.destination, { kind: 'fromTo' }>;
        expect((d.from as any[]).some((n) => n.type === 'link' && n.url === 'https://tokyo.example')).toBe(true);
        expect((d.to as any[]).some((n) => n.type === 'link' && n.url === 'https://london.example')).toBe(true);
    });

    it('destination: from ... to ... による fromTo（リンク保持）', () => {
        const line = '[am@Asia/Tokyo] - [18:45@Europe/London] flight JL043 [公式サイト](https://www.jal.co.jp/) from [Tokyo Haneda (HND)](https://haneda-airport.jp/) to [London Heathrow (LHR)](https://www.heathrow.com/)';
        const tokens = lexLine(line, {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('fromTo');
        const d = header.destination as Extract<typeof header.destination, { kind: 'fromTo' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as any)).toContain('Tokyo Haneda (HND)');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as any)).toContain('London Heathrow (LHR)');
    });
});
