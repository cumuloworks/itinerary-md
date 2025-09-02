import { describe, expect, it } from 'vitest';
import { makeDefaultServices } from '../../services';
import { lexLine } from '../lex';

describe('lexLine', () => {
    const sv = makeDefaultServices({});

    it('1行入力を LexTokens に変換する', () => {
        const out = lexLine('[08:00] flight ABC :: A - B', {}, sv);
        expect(out.raw).toContain('flight');
    });
});
