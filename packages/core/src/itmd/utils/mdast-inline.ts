import type { Parent, PhrasingContent, Text } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';

function cloneShallow<T extends object>(obj: T): T {
    return { ...(obj as any) } as T;
}

function sliceNode(node: PhrasingContent, start: number, end: number, accOffset: { value: number }): PhrasingContent[] {
    const lengthOf = (n: PhrasingContent): number => {
        if ((n as any).type === 'text') return ((n as Text).value || '').length;
        if ((n as any).type === 'inlineCode') return String((n as any).value ?? '').length;
        const t = mdastToString(n as any);
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

    if ((node as any).type === 'text') {
        const text = (node as Text).value || '';
        const relStart = overlapStart - nodeStart;
        const relEnd = overlapEnd - nodeStart;
        const sliced = text.slice(relStart, relEnd);
        if (sliced) results.push({ type: 'text', value: sliced } as any);
    } else if ((node as any).type === 'inlineCode') {
        const text = String((node as any).value ?? '');
        const relStart = overlapStart - nodeStart;
        const relEnd = overlapEnd - nodeStart;
        const sliced = text.slice(relStart, relEnd);
        if (sliced) results.push({ ...(node as any), value: sliced });
    } else if ('children' in (node as any) && Array.isArray((node as any).children)) {
        const parent = node as unknown as Parent & { children: PhrasingContent[] };
        const newChildren: PhrasingContent[] = [];
        for (const ch of parent.children) {
            const sliced = sliceNode(ch, start, end, accOffset);
            newChildren.push(...sliced);
        }
        if (newChildren.length > 0) {
            const cloned = cloneShallow(parent) as any;
            cloned.children = newChildren;
            results.push(cloned);
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
