import type { InlineCode, Parent, PhrasingContent, Text } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { RichInline } from '../types.js';

function cloneShallow<T extends object>(obj: T): T {
    return { ...obj };
}

function sliceNode(node: PhrasingContent, start: number, end: number, accOffset: { value: number }): PhrasingContent[] {
    const lengthOf = (n: PhrasingContent): number => {
        if (n.type === 'text') return ((n as Text).value || '').length;
        if (n.type === 'inlineCode') return String((n as InlineCode).value ?? '').length;
        const t = mdastToString(n);
        return t.length;
    };

    const results: PhrasingContent[] = [];
    const nodeStart = accOffset.value;
    const nodeEnd = nodeStart + lengthOf(node);
    // no overlap
    if (end <= nodeStart || start >= nodeEnd) {
        accOffset.value = nodeEnd;
        return results;
    }

    const overlapStart = Math.max(start, nodeStart);
    const overlapEnd = Math.min(end, nodeEnd);

    if (node.type === 'text') {
        const text = (node as Text).value || '';
        const relStart = overlapStart - nodeStart;
        const relEnd = overlapEnd - nodeStart;
        const sliced = text.slice(relStart, relEnd);
        if (sliced) results.push({ type: 'text', value: sliced } as Text);
    } else if (node.type === 'inlineCode') {
        const text = String((node as InlineCode).value ?? '');
        const relStart = overlapStart - nodeStart;
        const relEnd = overlapEnd - nodeStart;
        const sliced = text.slice(relStart, relEnd);
        if (sliced) results.push({ ...(node as InlineCode), value: sliced });
    } else if ('children' in node && Array.isArray((node as Parent).children)) {
        const parent = node as Parent & { children: PhrasingContent[] };
        const newChildren: PhrasingContent[] = [];
        for (const ch of parent.children) {
            const sliced = sliceNode(ch, start, end, accOffset);
            newChildren.push(...sliced);
        }
        if (newChildren.length > 0) {
            const cloned = cloneShallow(parent);
            (cloned as Parent & { children: PhrasingContent[] }).children = newChildren;
            results.push(cloned as PhrasingContent);
        }
        // parent case already advanced accOffset via recursion; early return to avoid double-advance
        return results;
    } else {
        // Fallback treat as text length; include entirely if overlapped
        results.push(node);
    }

    accOffset.value = nodeEnd;
    return results;
}

export function sliceInlineNodes(nodes: PhrasingContent[], start: number, end: number): PhrasingContent[] {
    if (end <= start) return [];
    const out: PhrasingContent[] = [];
    const acc = { value: 0 };
    for (const n of nodes) {
        const sliced = sliceNode(n, start, end, acc);
        out.push(...sliced);
    }
    return out;
}

// Split RichInline by the first '^' found in its plain-text representation.
// Returns left (primary) and right (alternative). If no caret found, right is null and left is the original nodes.
export function splitRichInlineByCaret(nodes: RichInline): { left: RichInline; right: RichInline | null } {
    try {
        const plain = mdastToString({ type: 'paragraph', children: nodes } as unknown as Parent) || '';
        const idx = plain.indexOf('^');
        if (idx < 0) return { left: nodes, right: null };
        const left = sliceInlineNodes(nodes, 0, idx);
        const right = sliceInlineNodes(nodes, idx + 1, plain.length);
        return { left, right: right.length > 0 ? right : [] };
    } catch {
        return { left: nodes, right: null };
    }
}
