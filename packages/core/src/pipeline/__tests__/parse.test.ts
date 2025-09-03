import type { Parent, PhrasingContent } from 'mdast';
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
        const d = header.destination as Extract<typeof header.destination, { kind: 'single' }>;
        const at = d.at;
        expect(mdastToString({ type: 'paragraph', children: at } as unknown as Parent)).toContain('Cafe Luna');
    });

    it('destination: A - B による dashPair', () => {
        const tokens = lexLine('[08:00] train :: A - B', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('dashPair');
        expect(header.title).toBeNull();
        const d = header.destination as Extract<typeof header.destination, { kind: 'dashPair' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as unknown as Parent)).toBe('A');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as unknown as Parent)).toBe('B');
    });

    it('リンク保持: single(::) の at にリンクが残る', () => {
        const line = '[08:00] lunch :: Visit Cafe';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[08:00] lunch :: Visit ' },
            { type: 'link', url: 'https://cafe.example', title: null, children: [{ type: 'text', value: 'Cafe' }] },
        ] as unknown as PhrasingContent[];
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('single');
        const d = header.destination as Extract<typeof header.destination, { kind: 'single' }>;
        const at = d.at as PhrasingContent[];
        const isLink = (n: PhrasingContent): n is import('mdast').Link => (n as unknown as { type?: string }).type === 'link';
        expect(at.some((n) => isLink(n) && n.url === 'https://cafe.example')).toBe(true);
    });

    it('リンク保持: dashPair の from/to にリンクが残る', () => {
        const line = '[08:00] flight :: NRT - MAD';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[08:00] flight :: ' },
            { type: 'link', url: 'https://a.example', title: null, children: [{ type: 'text', value: 'NRT' }] },
            { type: 'text', value: ' - ' },
            { type: 'link', url: 'https://b.example', title: null, children: [{ type: 'text', value: 'MAD' }] },
        ] as unknown as PhrasingContent[];
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('dashPair');
        const d = header.destination as Extract<typeof header.destination, { kind: 'dashPair' }>;
        const isLink = (n: PhrasingContent): n is import('mdast').Link => (n as unknown as { type?: string }).type === 'link';
        expect((d.from as PhrasingContent[]).some((n) => isLink(n) && n.url === 'https://a.example')).toBe(true);
        expect((d.to as PhrasingContent[]).some((n) => isLink(n) && n.url === 'https://b.example')).toBe(true);
    });

    it('リンク保持: fromTo の from/to にリンクが残る', () => {
        const line = '[am] flight JL from Tokyo to London';
        const tokens = lexLine(line, {}, sv);
        const mdInline = [
            { type: 'text', value: '[am] flight JL from ' },
            { type: 'link', url: 'https://tokyo.example', title: null, children: [{ type: 'text', value: 'Tokyo' }] },
            { type: 'text', value: ' to ' },
            { type: 'link', url: 'https://london.example', title: null, children: [{ type: 'text', value: 'London' }] },
        ] as unknown as PhrasingContent[];
        const header = parseHeader(tokens, mdInline, sv);
        expect(header.destination?.kind).toBe('fromTo');
        const d = header.destination as Extract<typeof header.destination, { kind: 'fromTo' }>;
        const isLink = (n: PhrasingContent): n is import('mdast').Link => (n as unknown as { type?: string }).type === 'link';
        expect((d.from as PhrasingContent[]).some((n) => isLink(n) && n.url === 'https://tokyo.example')).toBe(true);
        expect((d.to as PhrasingContent[]).some((n) => isLink(n) && n.url === 'https://london.example')).toBe(true);
    });

    it('destination: from ... to ... による fromTo（リンク保持）', () => {
        const line = '[am@Asia/Tokyo] - [18:45@Europe/London] flight JL043 [公式サイト](https://www.jal.co.jp/) from [Tokyo Haneda (HND)](https://haneda-airport.jp/) to [London Heathrow (LHR)](https://www.heathrow.com/)';
        const tokens = lexLine(line, {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('fromTo');
        const d = header.destination as Extract<typeof header.destination, { kind: 'fromTo' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as unknown as Parent)).toContain('Tokyo Haneda (HND)');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as unknown as Parent)).toContain('London Heathrow (LHR)');
    });

    it('time: point/range/marker/none を抽出', () => {
        // point
        let tokens = lexLine('[08:00] flight X', {}, sv);
        let h = parseHeader(tokens, [], sv);
        expect(h.time?.kind).toBe('point');

        // range
        tokens = lexLine('[08:00] - [10:15] activity Y', {}, sv);
        h = parseHeader(tokens, [], sv);
        expect(h.time?.kind).toBe('range');

        // marker
        tokens = lexLine('[am] coffee break', {}, sv);
        h = parseHeader(tokens, [], sv);
        expect(h.time?.kind).toBe('marker');

        // none: 空のブラケット
        tokens = lexLine('[] note free text', {}, sv);
        h = parseHeader(tokens, [], sv);
        expect(h.time?.kind).toBe('none');
    });

    it('positions: time/destination/title のオフセットを保持', () => {
        const line = '[08:00] flight JL from Tokyo to London';
        const tokens = lexLine(line, {}, sv);
        const h = parseHeader(tokens, [], sv);
        const timeStart = h.positions?.time?.start;
        expect(timeStart).toBeDefined();
        const raw = tokens.raw.trim();
        if (!timeStart) throw new Error('missing time start');
        expect(raw.slice(timeStart.start, timeStart.end)).toBe('08:00');
        expect(h.destination?.kind).toBe('fromTo');
        const dpos = h.positions?.destination;
        if (!dpos || !dpos.from || !dpos.to) throw new Error('missing destination positions');
        expect(raw.slice(dpos.from.start, dpos.from.end)).toContain('Tokyo');
        expect(raw.slice(dpos.to.start, dpos.to.end)).toContain('London');
        // title は eventType を除外後の 'JL'
        const ttl = h.positions?.title;
        if (ttl) expect(raw.slice(ttl.start, ttl.end)).toContain('JL');
    });

    it('no-sep の "A - B" は dashPair として解釈しない（必ず :: を要求）', () => {
        const tokens = lexLine('[08:00] flight A - B', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination).toBeNull();
        // title は eventType を除いた 'A - B' がそのまま入る
        expect(h.title && mdastToString({ type: 'paragraph', children: (h.title ?? []) as PhrasingContent[] } as unknown as Parent)).toBe('A - B');
    });

    it('ヘッダ内 from-to を解釈し、title は from 手前まで', () => {
        const tokens = lexLine('[am] activity walk from Park to Museum', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination?.kind).toBe('fromTo');
        expect(h.title && mdastToString({ type: 'paragraph', children: h.title as PhrasingContent[] } as unknown as Parent)).toContain('walk');
    });

    it('ダッシュが多重の場合、最後の " - " を区切りに from/to を切る（:: 必須）', () => {
        const tokens = lexLine('[08:00] route :: A - B - C', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination?.kind).toBe('dashPair');
        const d = h.destination as Extract<typeof h.destination, { kind: 'dashPair' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from } as unknown as Parent)).toBe('A - B');
        expect(mdastToString({ type: 'paragraph', children: d.to } as unknown as Parent)).toBe('C');
    });
});
