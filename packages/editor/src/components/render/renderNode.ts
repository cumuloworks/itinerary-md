import type { RootContent } from 'mdast';
import type { RenderBlockContext } from './renderBlock';
import { createRenderBlock } from './renderBlock';
import { renderInline } from './renderInline';

export const createRenderNode = (ctx: RenderBlockContext) => {
    const renderBlock = createRenderBlock(ctx);
    return (node: RootContent, idx: number) => {
        const type = (node as any)?.type as string;
        switch (type) {
            case 'paragraph':
            case 'heading':
            case 'list':
            case 'table':
            case 'code':
            case 'thematicBreak':
            case 'blockquote':
            case 'itmdEvent':
            case 'itmdHeading':
            case 'itmdAlert':
                return renderBlock(node as any, idx);
            default:
                // inline or unknown -> try inline
                return renderInline(((node as any)?.children as any[]) || []);
        }
    };
};
