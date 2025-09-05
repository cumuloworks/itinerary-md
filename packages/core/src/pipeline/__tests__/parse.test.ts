import type { Parent, PhrasingContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { lexLine } from '../lex';
import { parseHeader } from '../parse';

describe('parseHeader', () => {
    const sv = makeDefaultServices({});
    it('extracts eventType from "[08:00] flight ..."', () => {
        const tokens = lexLine('[08:00] flight IB6800 :: NRT - MAD', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.eventType).toBe('flight');
    });

    it('destination: single at via :: (title is null when omitted)', () => {
        const tokens = lexLine('[08:00] lunch :: Cafe Luna', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('single');
        // Do not fill the title when omitted
        expect(header.title).toBeNull();
        const d = header.destination as Extract<typeof header.destination, { kind: 'single' }>;
        const at = d.at;
        expect(mdastToString({ type: 'paragraph', children: at } as unknown as Parent)).toContain('Cafe Luna');
    });

    it('destination: dashPair via "A - B" (title is null when omitted)', () => {
        const tokens = lexLine('[08:00] train :: A - B', {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('dashPair');
        expect(header.title).toBeNull();
        const d = header.destination as Extract<typeof header.destination, { kind: 'dashPair' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as unknown as Parent)).toBe('A');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as unknown as Parent)).toBe('B');
    });

    it('link preservation: keep link in single(::) at', () => {
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

    it('link preservation: keep links in dashPair from/to', () => {
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

    it('link preservation: keep links in fromTo from/to', () => {
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

    it('destination: from ... to ... yields fromTo (link preserved)', () => {
        const line = '[am@Asia/Tokyo] - [18:45@Europe/London] flight JL043 [公式サイト](https://www.jal.co.jp/) from [Tokyo Haneda (HND)](https://haneda-airport.jp/) to [London Heathrow (LHR)](https://www.heathrow.com/)';
        const tokens = lexLine(line, {}, sv);
        const header = parseHeader(tokens, [], sv);
        expect(header.destination?.kind).toBe('fromTo');
        const d = header.destination as Extract<typeof header.destination, { kind: 'fromTo' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from ?? [] } as unknown as Parent)).toContain('Tokyo Haneda (HND)');
        expect(mdastToString({ type: 'paragraph', children: d.to ?? [] } as unknown as Parent)).toContain('London Heathrow (LHR)');
    });

    it('extracts time: point/range/marker/none', () => {
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

        // none: empty brackets
        tokens = lexLine('[] note free text', {}, sv);
        h = parseHeader(tokens, [], sv);
        expect(h.time?.kind).toBe('none');
    });

    it('retains offsets of time/destination/title', () => {
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
        // title is 'JL' after excluding eventType
        const ttl = h.positions?.title;
        if (ttl) expect(raw.slice(ttl.start, ttl.end)).toContain('JL');
    });

    it('does not interpret "A - B" without sep as dashPair (requires ::)', () => {
        const tokens = lexLine('[08:00] flight A - B', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination).toBeNull();
        // title becomes 'A - B' after excluding eventType
        expect(h.title && mdastToString({ type: 'paragraph', children: (h.title ?? []) as PhrasingContent[] } as unknown as Parent)).toBe('A - B');
    });

    it('interprets from-to in header; title is up to before "from"', () => {
        const tokens = lexLine('[am] activity walk from Park to Museum', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination?.kind).toBe('fromTo');
        expect(h.title && mdastToString({ type: 'paragraph', children: h.title as PhrasingContent[] } as unknown as Parent)).toContain('walk');
    });

    it('with multiple dashes, split from/to at the last " - " (requires ::)', () => {
        const tokens = lexLine('[08:00] route :: A - B - C', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination?.kind).toBe('dashPair');
        const d = h.destination as Extract<typeof h.destination, { kind: 'dashPair' }>;
        expect(mdastToString({ type: 'paragraph', children: d.from } as unknown as Parent)).toBe('A - B');
        expect(mdastToString({ type: 'paragraph', children: d.to } as unknown as Parent)).toBe('C');
    });

    it('shorthand: [] flight :: A - B → do not fill title', () => {
        const tokens = lexLine('[] flight :: A - B', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.eventType).toBe('flight');
        expect(h.title).toBeNull();
    });

    it('shorthand: [] flight from Tokyo to Haneda → do not fill title', () => {
        const tokens = lexLine('[] flight from Tokyo to Haneda', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.eventType).toBe('flight');
        expect(h.destination?.kind).toBe('fromTo');
        expect(h.title).toBeNull();
    });

    it('shorthand: [] sightseeing :: Sumida → do not fill title', () => {
        const tokens = lexLine('[] sightseeing :: Sumida', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.eventType).toBe('sightseeing');
        expect(h.title).toBeNull();
    });

    it('shorthand: [] stay :: Ritz → do not fill title', () => {
        const tokens = lexLine('[] stay :: Ritz', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.eventType).toBe('stay');
        expect(h.title).toBeNull();
    });

    it('shorthand with time: [18:00] stay :: Ritz → do not fill title', () => {
        const tokens = lexLine('[18:00] stay :: Ritz', {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.eventType).toBe('stay');
        expect(h.title).toBeNull();
        expect(h.destination?.kind).toBe('single');
    });

    it('single(at): correctly skip the two letters "at" (prevent regression of "t hotel" issue)', () => {
        const line = '[06:30] breakfast Traditional Japanese breakfast at hotel';
        const tokens = lexLine(line, {}, sv);
        const h = parseHeader(tokens, [], sv);
        expect(h.destination?.kind).toBe('single');
        const d = h.destination as Extract<typeof h.destination, { kind: 'single' }>;
        const at = d.at as PhrasingContent[];
        expect(mdastToString({ type: 'paragraph', children: at } as unknown as Parent)).toBe('hotel');
    });
});
