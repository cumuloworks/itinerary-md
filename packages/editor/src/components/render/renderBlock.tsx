import type React from 'react';
import { BlockquoteBlock } from './blocks/BlockquoteBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ItmdAlertBlock } from './blocks/ItmdAlertBlock';
import { ItmdEventBlock } from './blocks/ItmdEventBlock';
import { ItmdHeadingBlock } from './blocks/ItmdHeadingBlock';
import { ListBlock } from './blocks/ListBlock';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { ThematicBreak } from './blocks/ThematicBreak';
import type { MdNode, RenderBlockContext } from './types';

// Types are centralized in ./types

export const createRenderBlock = (ctx: RenderBlockContext) => {
    const { getLineStart, getLineEnd, getNodeDateAttr, displayTimezone, currency, lastStaySegmentsByDate, inlineToSegments, segmentsToPlainText } = ctx;

    const renderBlock = (node: MdNode, idx: number): React.ReactNode => {
        if (!node) return null;
        const type = (node as { type?: string }).type;
        const lineStart = getLineStart(node);
        const lineEnd = getLineEnd(node);
        const nodeDateAttr = getNodeDateAttr(node);
        const commonDataProps: any = {
            'data-itin-line-start': lineStart ? String(lineStart) : undefined,
            'data-itin-line-end': lineEnd ? String(lineEnd) : undefined,
            'data-itmd-date': nodeDateAttr,
        };

        if (type === 'itmdHeading') {
            return <ItmdHeadingBlock key={`itmdh-${lineStart ?? idx}`} node={node} commonDataProps={commonDataProps} lastStaySegmentsByDate={lastStaySegmentsByDate} />;
        }

        if (type === 'itmdAlert') {
            return (
                <ItmdAlertBlock
                    key={`itmdalert-${lineStart ?? idx}`}
                    node={node}
                    commonDataProps={commonDataProps}
                    getLineStart={getLineStart as any}
                    getLineEnd={getLineEnd as any}
                    getNodeDateAttr={getNodeDateAttr as any}
                    renderBlock={renderBlock}
                />
            );
        }

        if (type === 'itmdEvent') {
            return (
                <ItmdEventBlock
                    key={`itmde-${lineStart ?? idx}`}
                    node={node}
                    commonDataProps={commonDataProps}
                    getNodeDateAttr={getNodeDateAttr as any}
                    displayTimezone={displayTimezone}
                    currency={currency}
                    inlineToSegments={inlineToSegments as any}
                    segmentsToPlainText={segmentsToPlainText as any}
                />
            );
        }

        if (type === 'heading') {
            return <HeadingBlock key={`h-${lineStart ?? idx}`} node={node} commonDataProps={commonDataProps} />;
        }

        if (type === 'paragraph') {
            return <ParagraphBlock key={`p-${lineStart ?? idx}`} node={node} commonDataProps={commonDataProps} />;
        }

        if (type === 'list') {
            return <ListBlock key={`list-${lineStart ?? idx}`} node={node} commonDataProps={commonDataProps} getLineStart={getLineStart as any} getLineEnd={getLineEnd as any} renderBlock={renderBlock} />;
        }

        if (type === 'blockquote') {
            return <BlockquoteBlock key={`bq-${lineStart ?? idx}`} node={node} commonDataProps={commonDataProps} getLineStart={getLineStart as any} renderBlock={renderBlock} />;
        }

        if (type === 'code') {
            const lang = typeof (node as any).lang === 'string' ? (node as any).lang : undefined;
            const value = typeof (node as any).value === 'string' ? (node as any).value : '';
            return <CodeBlock key={`pre-${lineStart ?? idx}`} lang={lang} value={value} dataProps={commonDataProps} />;
        }

        if (type === 'thematicBreak') {
            return <ThematicBreak key={`hr-${lineStart ?? idx}`} commonDataProps={commonDataProps} />;
        }

        return null;
    };

    return renderBlock;
};
