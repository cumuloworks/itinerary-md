import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { lexLine } from '../lex';

describe('lexLine', () => {
    const sv = makeDefaultServices({});

    it('1行入力を LexTokens に変換する', () => {
        const out = lexLine('[08:00] flight ABC :: A - B', {}, sv);
        expect(out.raw).toContain('flight');
    });

    it('shadow と map が提供され、ASCII では恒等', () => {
        const line = '[08:00] flight ABC :: A - B';
        const t = lexLine(line, {}, sv);
        expect(t.shadow).toBe(line);
        expect(t.map(5)).toBe(5);
    });

    it('括弧/リンク/コード外のみで ::, at, routeDash を検出', () => {
        const line = '[08:00] lunch at Cafe :: X - Y [link: http://a-b.com] (`code - span`)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('doublecolon')).toBe(true);
        expect(kinds.includes('at')).toBe(true);
        expect(kinds.includes('routeDash')).toBe(true);
    });

    it('from/to を検出（outside のみ）', () => {
        const line = '[08:00] flight JL from Tokyo to London';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(true);
        expect(kinds.includes('to')).toBe(true);
    });

    it('括弧内の from/to は無視', () => {
        const line = '[08:00] flight JL (from Osaka to Sapporo)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        expect(kinds.includes('to')).toBe(false);
    });

    it('リンクテキスト内の from/to は無視', () => {
        const line = '[08:00] activity go [from here to there](https://example.com)';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        expect(kinds.includes('to')).toBe(false);
    });

    it('コードスパン内の from/to は無視', () => {
        const line = '[08:00] note `from A to B` outside to';
        const t = lexLine(line, {}, sv);
        const kinds = t.seps.map((s) => s.kind);
        expect(kinds.includes('from')).toBe(false);
        // outside の to は検出される
        expect(kinds.includes('to')).toBe(true);
    });
});
