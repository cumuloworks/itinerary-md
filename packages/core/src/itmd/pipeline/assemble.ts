import type { Parent, PhrasingContent, Root } from 'mdast';
import type { Position } from 'unist';
import type { Services } from '../services';
import { buildEventNode } from './build';
import { lexLine } from './lex';
import { normalizeHeader } from './normalize';
import { parseHeader } from './parse';
import { validateHeader } from './validate';

export function assembleEvents(root: Root, sv: Services): Root {
    const parent = root as unknown as Parent;
    const children = Array.isArray(parent.children) ? parent.children : [];

    for (let i = 0; i < children.length; i += 1) {
        const node = children[i] as unknown as { type?: string; children?: unknown[]; position?: Position };
        if (node?.type !== 'paragraph') continue;

        const para = node as unknown as Parent & { type: 'paragraph' };
        const inline = (para.children ?? []) as unknown[] as PhrasingContent[];

        const firstText = inline
            .map((n) => (typeof (n as unknown as { value?: unknown }).value === 'string' ? (n as unknown as { value: string }).value : ''))
            .join('')
            .trim();
        if (!firstText.startsWith('[')) continue;

        const tokens = lexLine(firstText, {}, sv);
        const parsed = parseHeader(tokens, inline, sv);
        const normalized = normalizeHeader(parsed, { baseTz: sv.policy.tzFallback ?? undefined, dateISO: undefined }, sv);
        const { header, warnings } = validateHeader(normalized, sv);
        const built = buildEventNode(header, [], para.position, sv);
        built.warnings = [...(built.warnings ?? []), ...warnings];
        children[i] = built as unknown as Parent['children'][number];
    }

    return root;
}
