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
});
