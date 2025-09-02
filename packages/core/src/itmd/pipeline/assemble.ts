import type { Parent, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Position } from 'unist';
import { parseDateText } from '../../parser/parsers/date';
import type { Services } from '../services';
import { sliceInlineNodes } from '../utils/mdast-inline';
import { buildEventNode } from './build';
import { lexLine } from './lex';
import { normalizeHeader } from './normalize';
import { parseHeader } from './parse';
import { validateHeader } from './validate';

export function assembleEvents(root: Root, sv: Services): Root {
    const parent = root as unknown as Parent;
    const children = Array.isArray(parent.children) ? parent.children : [];
    let currentDateISO: string | undefined;
    let currentDateTz: string | undefined;

    for (let i = 0; i < children.length; i += 1) {
        const node = children[i] as unknown as { type?: string; children?: unknown[]; position?: Position };
        if (node?.type === 'heading' && (node as unknown as { depth?: number }).depth === 2) {
            const h = node as unknown as Parent & { type: 'heading' };
            const inline = (h.children ?? []) as unknown[] as PhrasingContent[];
            const text = inline
                .map((n) => (typeof (n as unknown as { value?: unknown }).value === 'string' ? (n as unknown as { value: string }).value : ''))
                .join('')
                .trim();
            const d = parseDateText(text, sv.policy.tzFallback ?? undefined);
            currentDateISO = d?.date || currentDateISO;
            currentDateTz = d?.timezone || currentDateTz;
            continue;
        }
        if (node?.type !== 'paragraph') continue;

        const para = node as unknown as Parent & { type: 'paragraph' };
        const inline = (para.children ?? []) as unknown[] as PhrasingContent[];

        const paraText = mdastToString(para as unknown as any);
        const nlIdx = paraText.indexOf('\n');
        const firstLineText = nlIdx >= 0 ? paraText.slice(0, nlIdx) : paraText;
        const restText = nlIdx >= 0 ? paraText.slice(nlIdx + 1) : '';
        const hasSecondLineText = restText.trim().length > 0;
        if (!firstLineText.trimStart().startsWith('[')) continue;

        const inlineFirstLine = sliceInlineNodes(inline, 0, nlIdx >= 0 ? nlIdx : firstLineText.length);

        const tokens = lexLine(firstLineText, {}, sv);
        const parsed = parseHeader(tokens, inlineFirstLine, sv);
        const normalized = normalizeHeader(parsed, { baseTz: currentDateTz ?? sv.policy.tzFallback ?? undefined, dateISO: currentDateISO }, sv);
        const { header, warnings } = validateHeader(normalized, sv);
        // 直後が list のときのみ、連続する list を吸収（paragraph は吸収しない）
        const absorbed: Parent['children'] = [];
        const firstNext = children[i + 1] as unknown as { type?: string } | undefined;
        if (!hasSecondLineText && firstNext && firstNext.type === 'list') {
            const j = i + 1;
            while (j < children.length) {
                const nx = children[j] as unknown as { type?: string } | undefined;
                if (!nx || nx.type !== 'list') break;
                absorbed.push(children[j] as never);
                children.splice(j, 1);
                // splice したので j は据え置きで次を再評価
            }
        }

        // meta 抽出: list の先頭段落から "key: value" を収集（1段のみ）。値は RichInline を保持
        const meta: Record<string, PhrasingContent[]> = {};
        for (const nodeAbs of absorbed) {
            if (!nodeAbs || (nodeAbs as unknown as { type?: string }).type !== 'list') continue;
            const list = nodeAbs as unknown as Parent & { type: 'list' };
            const items = Array.isArray(list.children) ? list.children : [];
            for (const it of items) {
                const li = it as unknown as Parent & { type?: string };
                const kids = Array.isArray(li.children) ? li.children : [];
                const para0 = kids.find((n) => (n as unknown as { type?: string })?.type === 'paragraph') as (Parent & { type: 'paragraph' }) | undefined;
                const inline = (para0?.children ?? []) as unknown as PhrasingContent[];
                const raw = para0 ? mdastToString(para0 as unknown as any) : mdastToString(li as unknown as any);
                const text = String(raw || '').trim();
                const idx = text.indexOf(':');
                if (idx > 0) {
                    const keyRaw = text.slice(0, idx).trim().toLowerCase();
                    const key = keyRaw.replace(/^[-\s]+/, '');
                    let valStart = idx + 1;
                    if (text[valStart] === ' ') valStart += 1;
                    const valueNodes = inline.length > 0 ? sliceInlineNodes(inline, valStart, text.length) : ([{ type: 'text', value: text.slice(valStart) }] as any);
                    if (key) meta[key] = valueNodes as any;
                }
            }
        }
        // position: 段落開始〜吸収した最後のノードの end までをカバー
        const lastAbs = absorbed.length > 0 ? (absorbed[absorbed.length - 1] as unknown as { position?: Position }) : undefined;
        const combinedPos: Position | undefined = para.position
            ? {
                  start: para.position.start,
                  end: (lastAbs?.position?.end as any) || para.position.end,
              }
            : undefined;

        // ヘッダ行の段落（先頭行のみ）を children の先頭に含める
        const headerPara: Parent = { type: 'paragraph', children: inlineFirstLine as unknown as Parent['children'] } as unknown as Parent;
        const childrenOut: Parent['children'] = [headerPara as never, ...absorbed];
        const built = buildEventNode(header, childrenOut as any, combinedPos, sv);
        if (Object.keys(meta).length > 0) (built as any).meta = meta;
        built.warnings = [...(built.warnings ?? []), ...warnings];
        children[i] = built as unknown as Parent['children'][number];
    }

    return root;
}
