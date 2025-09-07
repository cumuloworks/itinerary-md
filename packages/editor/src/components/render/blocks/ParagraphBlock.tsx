import type React from 'react';
import { renderInline } from '@/components/render/renderInline';
import type { MdNode } from '@/components/render/types';
import { getHProps, mergeClassNames } from '@/components/render/utils';

export const ParagraphBlock: React.FC<{
    node: MdNode;
    commonDataProps: any;
}> = ({ node, commonDataProps }) => {
    const hProps = getHProps(node);
    const { className: hClass, ...hRest } = hProps as any;
    const pClass = mergeClassNames('mb-4 leading-relaxed text-gray-800 text-base ml-24', hClass as string | undefined);
    return (
        <p className={pClass} {...hRest} {...commonDataProps}>
            {renderInline(((node as any).children as any[]) || [])}
        </p>
    );
};
