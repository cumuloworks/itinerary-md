import {
  CircleAlert,
  OctagonAlert,
  TriangleAlert,
  Info,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

import { renderInline } from '@/components/render/renderInline';
import { mergeClassNames } from '@/components/render/utils';

// Icon and colors mapping aligned with AlertBlock
type IconVariant = 'tip' | 'warning' | 'caution' | 'danger' | 'important';

// Looked up directly in render: the React Compiler treats a component obtained
// from a function call as "created during render".
const ICON_BY_VARIANT: Record<IconVariant, LucideIcon> = {
  tip: Lightbulb,
  warning: TriangleAlert,
  caution: OctagonAlert,
  danger: OctagonAlert,
  important: CircleAlert,
};

const isIconVariant = (v: string): v is IconVariant =>
  Object.prototype.hasOwnProperty.call(ICON_BY_VARIANT, v);

function getStyleByVariant(kind?: string): {
  text: string;
  border: string;
  bgColor: string;
} {
  const vv = String(kind || '').toLowerCase();
  switch (vv) {
    case 'tip':
      return {
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        bgColor: 'bg-emerald-600',
      };
    case 'warning':
      return {
        text: 'text-amber-600',
        border: 'border-amber-200',
        bgColor: 'bg-amber-600',
      };
    case 'caution':
      return {
        text: 'text-red-600',
        border: 'border-red-200',
        bgColor: 'bg-red-600',
      };
    case 'important':
      return {
        text: 'text-purple-600',
        border: 'border-purple-200',
        bgColor: 'bg-purple-600',
      };
    default:
      return {
        text: 'text-gray-600',
        border: 'border-gray-200',
        bgColor: 'bg-gray-600',
      };
  }
}

export const ItmdAlertBlock: React.FC<{
  node: any;
  commonDataProps: any;
  getLineStart: (n: any) => number | undefined;
  getLineEnd: (n: any) => number | undefined;
  getNodeDateAttr: (n: any) => string | undefined;
  renderBlock: (n: any, i: number) => React.ReactNode;
}> = ({
  node,
  commonDataProps,
  getLineStart,
  getLineEnd,
  getNodeDateAttr,
  renderBlock,
}) => {
  const rawVariant = (node as any)?.variant as string | undefined;
  const v = typeof rawVariant === 'string' ? rawVariant.toLowerCase() : '';
  const allowedVariants = new Set([
    'note',
    'tip',
    'important',
    'warning',
    'caution',
  ]);
  const variant = allowedVariants.has(v) ? v : 'info';
  const titleText = (node as any)?.title as string | undefined;
  const inlineTitle = (node as any)?.inlineTitle as any[] | undefined;
  const children = (node as any)?.children as any[] | undefined;

  const subtitleEl = inlineTitle ? renderInline(inlineTitle) : undefined;

  const Icon = isIconVariant(variant) ? ICON_BY_VARIANT[variant] : Info; // note/info/default
  const colors = getStyleByVariant(variant);

  const contentEls =
    children?.map((c: any, ci: number) => {
      const cStart = getLineStart(c);
      const cEnd = getLineEnd(c);
      const cDate = getNodeDateAttr(c);
      const key = `alert-c-${cStart ?? ci}`;
      if (c.type === 'paragraph') {
        const childDataProps: any = {
          ...commonDataProps,
          'data-itin-line-start': cStart ? String(cStart) : undefined,
          'data-itin-line-end': cEnd ? String(cEnd) : undefined,
          'data-itmd-date': cDate,
        };
        return (
          <p key={key} {...childDataProps}>
            {renderInline(c.children || [])}
          </p>
        );
      }
      return <React.Fragment key={key}>{renderBlock(c, ci)}</React.Fragment>;
    }) || [];

  const { className: extraClass, ...rest } = commonDataProps || {};
  const mergedClassName = mergeClassNames(
    'contents',
    extraClass as string | undefined
  );
  return (
    <div className={mergedClassName} {...rest}>
      <div className="group/event relative my-3 break-inside-avoid">
        <div className="grid grid-cols-[3.5rem_min-content_minmax(0,1fr)] items-center gap-x-3 py-2">
          {/* 1: Fixed width empty time column */}
          <div className="col-start-1 row-start-1"></div>

          {/* 2: Icon (top circle) */}
          <div className="col-start-2 row-start-1 flex items-center justify-center">
            <div
              className={`flex size-7 items-center justify-center rounded-full ${colors.bgColor} relative z-10`}
            >
              <Icon className="size-4 text-white" />
            </div>
          </div>

          {/* 3: Body */}
          <div className={`col-start-3 row-start-1 min-w-0 py-2`}>
            {titleText || subtitleEl ? (
              <div className="flex items-center gap-2">
                {titleText ? (
                  <span className={`text-lg font-bold ${colors.text}`}>
                    {titleText}
                  </span>
                ) : null}
                {subtitleEl ? (
                  <span className="truncate text-sm font-medium text-gray-600">
                    {subtitleEl}
                  </span>
                ) : null}
              </div>
            ) : null}
            {contentEls.length > 0 ? (
              <div className={`mt-0.5 border-t pt-2 ${colors.border}`}>
                <div className="text-xs text-gray-700">{contentEls}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
