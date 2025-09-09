import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { lexLine } from '../lex';

describe('lexLine', () => {
    const sv = makeDefaultServices({});

    it('converts a single line into LexTokens', () => {
        const out = lexLine('[08:00] flight ABC :: A - B', {}, sv);
        expect(out.raw).toContain('flight');
    });

    it('provides shadow and map; identity for ASCII', () => {
        const line = '[08:00] flight ABC :: A - B';
        const t = lexLine(line, {}, sv);
        expect(t.shadow).toBe(line);
        expect(t.map(5)).toBe(5);
    });

    it('detects ::, at, routeDash only outside parentheses/links/code', () => {
        const line = '[08:00] lunch at Cafe :: X - Y [link: http://a-b.com] (`code - span`)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('doublecolon')).toBe(true);
        expect(kinds.includes('at')).toBe(true);
        expect(kinds.includes('routeDash')).toBe(true);
    });

    it('detects from/to (outside only)', () => {
        const line = '[08:00] flight JL from Tokyo to London';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(true);
        expect(kinds.includes('to')).toBe(true);
    });

    it('detects via (outside only)', () => {
        const line = '[08:00] flight JL from Tokyo via Dubai to London';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(true);
        expect(kinds.includes('via')).toBe(true);
        expect(kinds.includes('to')).toBe(true);
    });

    it('ignores from/to inside parentheses', () => {
        const line = '[08:00] flight JL (from Osaka to Sapporo)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        expect(kinds.includes('to')).toBe(false);
    });

    it('ignores from/to inside link text', () => {
        const line = '[08:00] activity go [from here to there](https://example.com)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        expect(kinds.includes('to')).toBe(false);
    });

    it('ignores from/to inside code span', () => {
        const line = '[08:00] note `from A to B` outside to';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        // 'to' in outside context is detected
        expect(kinds.includes('to')).toBe(true);
    });

    it('ignores via inside parentheses/link/code', () => {
        const t1 = lexLine('[08:00] flight (via Osaka) to Tokyo', {}, sv);
        expect(t1.seps.map((s) => s.kind).includes('via')).toBe(false);

        const t2 = lexLine('[08:00] activity go [via somewhere](https://ex) to there', {}, sv);
        expect(t2.seps.map((s) => s.kind).includes('via')).toBe(false);

        const t3 = lexLine('[08:00] note `via code` to X', {}, sv);
        expect(t3.seps.map((s) => s.kind).includes('via')).toBe(false);
    });
});
