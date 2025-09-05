import type { Blockquote, Paragraph, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export type ItmdAlertNode = {
    type: 'itmdAlert';
    variant: 'note' | 'tip' | 'important' | 'warning' | 'caution';
    title?: string;
    inlineTitle?: PhrasingContent[];
    children: any[];
    position?: any;
    data?: { hProperties?: Record<string, unknown> };
};

/**
 * remarkItineraryAlert
 * Convert GitHub-style blockquote alerts (e.g. > [!NOTE]) into itmdAlert nodes
 */
export const remarkItineraryAlert: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
            if (!parent || typeof index !== 'number' || node.children.length === 0) return;
            const firstChild = node.children[0];
            if (firstChild.type !== 'paragraph') return;
            const paragraph = firstChild as Paragraph;
            if (paragraph.children.length === 0) return;
            const p0 = paragraph.children[0] as any;
            if (p0?.type !== 'text' || typeof p0.value !== 'string') return;
            const m = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(p0.value);
            if (!m) return;
            const variant = m[1].toLowerCase() as ItmdAlertNode['variant'];
            const remainingText = p0.value.slice(m[0].length);
            const inlineTitle: PhrasingContent[] = [];
            if (remainingText.trim()) inlineTitle.push({ type: 'text', value: remainingText });
            if (paragraph.children.length > 1) inlineTitle.push(...(paragraph.children.slice(1) as PhrasingContent[]));

            const alertNode: ItmdAlertNode = {
                type: 'itmdAlert',
                variant,
                title: variant.toUpperCase(),
                inlineTitle: inlineTitle.length > 0 ? inlineTitle : undefined,
                children: [],
                position: node.position,
                data: { hProperties: {} },
            };
            if (node.children.length > 1) alertNode.children.push(...node.children.slice(1));
            parent.children[index] = alertNode as any;
        });
    };
};
