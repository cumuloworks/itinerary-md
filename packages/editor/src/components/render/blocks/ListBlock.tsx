import React from 'react';
import { renderInline } from '@/components/render/renderInline';
import type { MdNode } from '@/components/render/types';
import { mergeClassNames } from '@/components/render/utils';

export const ListBlock: React.FC<{
    node: MdNode;
    commonDataProps: any;
    getLineStart: (n: any) => number | undefined;
    getLineEnd: (n: any) => number | undefined;
    renderBlock: (n: any, i: number) => React.ReactNode;
}> = ({ node, commonDataProps, getLineStart, getLineEnd, renderBlock }) => {
    const ordered = !!(node as any).ordered;
    const start = (node as any).start as number | undefined;
    const items = Array.isArray((node as any).children) ? ((node as any).children as any[]) : [];
    const listDataProps: any = { ...commonDataProps };
    const listProps: any = { ...listDataProps };
    if (ordered && typeof start === 'number') listProps.start = start;
    const children = items.map((li, i) => {
        const liStart = getLineStart(li);
        const liEnd = getLineEnd(li);
        const isTask = typeof li.checked === 'boolean';
        const isChecked = !!li.checked;
        const checkbox = isTask ? <input type="checkbox" checked={isChecked} readOnly className="absolute -left-6 top-1 w-4 h-4 rounded border-2 border-gray-400 bg-white accent-blue-600" /> : null;
        const liChildren = Array.isArray(li.children) ? li.children : [];
        const liClass = `mb-2 leading-relaxed text-gray-800 ${isTask ? 'task-list-item list-none relative' : ''}`;
        return (
            <li key={`li-${liStart ?? i}`} className={liClass} data-itin-line-start={liStart ? String(liStart) : undefined} data-itin-line-end={liEnd ? String(liEnd) : undefined}>
                {checkbox}
                {liChildren.map((c: any, ci: number) => {
                    const cStart = getLineStart(c);
                    const key = `lic-${cStart ?? ci}`;
                    if (c.type === 'paragraph')
                        return (
                            <span key={key} className={isTask && isChecked ? 'text-gray-500 line-through' : undefined}>
                                {renderInline(c.children || [])}
                            </span>
                        );
                    return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
                })}
            </li>
        );
    });
    return ordered
        ? (() => {
              const { className: extraClass, ...rest } = listProps || {};
              const mergedClassName = mergeClassNames('mb-6 space-y-2 ml-24 list-decimal', extraClass as string | undefined);
              return (
                  <ol className={mergedClassName} {...rest}>
                      {children}
                  </ol>
              );
          })()
        : (() => {
              const { className: extraClass, ...rest } = listProps || {};
              const mergedClassName = mergeClassNames('mb-6 space-y-2 ml-24 list-disc marker:text-blue-600 marker:font-bold marker:text-lg', extraClass as string | undefined);
              return (
                  <ul className={mergedClassName} {...rest}>
                      {children}
                  </ul>
              );
          })();
};
