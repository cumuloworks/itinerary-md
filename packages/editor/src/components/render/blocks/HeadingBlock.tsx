import type React from 'react';
import { renderInline } from '@/components/render/renderInline';
import type { MdNode } from '@/components/render/types';
import { getHProps, mergeClassNames } from '@/components/render/utils';

export const HeadingBlock: React.FC<{
    node: MdNode;
    commonDataProps: any;
}> = ({ node, commonDataProps }) => {
    const depth = (node as { depth?: number }).depth || 1;
    const inline = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
    const content = renderInline(inline);
    if (content == null) return null;

    const hProps = getHProps(node);
    const { className: hClassFromProps, ...hRest } = hProps as any;
    const dataProps: any = { ...commonDataProps };
    const hClass = (() => {
        switch (depth) {
            case 1:
                return 'text-4xl font-bold text-gray-900 mb-6 mt-6 ml-0';
            case 2:
                return 'text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6 ml-0';
            case 3:
                return 'text-lg font-semibold text-gray-800 mb-3 mt-6 ml-0';
            case 4:
                return 'text-base font-semibold text-gray-800 mb-2 mt-4 ml-0';
            case 5:
                return 'text-sm font-semibold text-gray-800 mb-2 mt-4 ml-0';
            default:
                return 'text-xs font-semibold text-gray-800 mb-2 mt-4 ml-0';
        }
    })();
    const mergedClassName = mergeClassNames(hClass, hClassFromProps as string | undefined);
    switch (depth) {
        case 1:
            return (
                <h1 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h1>
            );
        case 2:
            return (
                <h2 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h2>
            );
        case 3:
            return (
                <h3 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h3>
            );
        case 4:
            return (
                <h4 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h4>
            );
        case 5:
            return (
                <h5 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h5>
            );
        default:
            return (
                <h6 className={mergedClassName} {...hRest} {...dataProps}>
                    {content}
                </h6>
            );
    }
};
