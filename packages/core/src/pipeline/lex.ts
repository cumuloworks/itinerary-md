import type { Services } from '../services';

export type LexTokens = {
    raw: string;
    shadow: string;
    map: (shadowIdx: number) => number;
    seps: Array<{ kind: 'doublecolon' | 'at' | 'routeDash' | 'from' | 'to'; index: number }>;
};

export function lexLine(line: string, _ctx: { baseTz?: string }, _sv: Services): LexTokens {
    const sh = _sv.unicode.makeShadow(line);
    const s = sh.shadow;
    const seps: LexTokens['seps'] = [];
    let inCode = false;
    let sq = 0; // [ ] depth
    let par = 0; // ( ) depth
    const isOutside = () => !inCode && sq === 0 && par === 0;
    for (let i = 0; i < s.length; i += 1) {
        const ch = s[i];
        const next = s[i + 1] || '';
        if (ch === '`') {
            inCode = !inCode;
            continue;
        }
        if (inCode) continue;
        if (ch === '[') {
            sq += 1;
            continue;
        }
        if (ch === ']') {
            if (sq > 0) sq -= 1;
            continue;
        }
        if (ch === '(') {
            par += 1;
            continue;
        }
        if (ch === ')') {
            if (par > 0) par -= 1;
            continue;
        }

        if (isOutside()) {
            // '::' (spaces required around)
            if (ch === ':' && next === ':' && s[i - 1] === ' ' && s[i + 2] === ' ') {
                seps.push({ kind: 'doublecolon', index: i });
                i += 1; // skip next ':'
                continue;
            }
            // route dash: space-hyphen-space
            if (ch === ' ' && next === '-' && s[i + 2] === ' ') {
                seps.push({ kind: 'routeDash', index: i + 1 });
                continue;
            }
            // word separators: at/from/to (spaces required; line start/end allowed as boundaries)
            const rest = s.slice(i);
            const prevIsBoundary = i === 0 || s[i - 1] === ' ';
            if (prevIsBoundary && rest.startsWith('at') && (rest[2] === ' ' || rest.length === 2)) {
                seps.push({ kind: 'at', index: i });
                i += 1; // advance a bit
                continue;
            }
            if (prevIsBoundary && rest.startsWith('from') && (rest[4] === ' ' || rest.length === 4)) {
                seps.push({ kind: 'from', index: i });
                i += 3;
                continue;
            }
            if (prevIsBoundary && rest.startsWith('to') && (rest[2] === ' ' || rest.length === 2)) {
                seps.push({ kind: 'to', index: i });
                i += 1;
            }
        }
    }
    return { raw: line, shadow: sh.shadow, map: sh.map, seps };
}
