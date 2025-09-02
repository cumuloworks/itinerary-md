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
