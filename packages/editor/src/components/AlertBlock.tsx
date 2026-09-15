import {
  CircleAlert,
  OctagonAlert,
  TriangleAlert,
  Info,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';

import { TimePlaceholder } from '@/components/itinerary/TimePlaceholder';

export type AlertVariant = 'note' | 'tip' | 'important' | 'warning' | 'caution';

type AlertBlockProps = {
  variant?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
};

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

function getStyleByVariant(variant?: string): {
  text: string;
  border: string;
  bgColor: string;
} {
  const v = String(variant || '').toLowerCase();
  switch (v) {
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

export const AlertBlock: FC<AlertBlockProps> = ({
  variant,
  title,
  subtitle,
  children,
  className,
}) => {
  const variantKey = String(variant || '').toLowerCase();
  const Icon = isIconVariant(variantKey) ? ICON_BY_VARIANT[variantKey] : Info; // note/info/default
  const colors = getStyleByVariant(variant);
  const hasBody = React.Children.count(children) > 0;
  return (
    <div className={`my-3 flex items-center ${className || ''}`.trim()}>
      <div className="flex min-w-0 flex-col gap-5 text-right">
        <TimePlaceholder />
      </div>
      <div className="relative z-10 ml-3 flex items-center justify-center">
        <div
          className={`flex h-8 w-8 items-center justify-center ${colors.bgColor} rounded-full`}
        >
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div
        className={`min-w-0 flex-1 ${hasBody ? 'p-5' : 'px-5'} -ml-4.5 pl-8`}
      >
        {title || subtitle ? (
          <div className="flex items-center gap-2">
            {title ? (
              <span className={`text-lg font-bold ${colors.text}`}>
                {title}
              </span>
            ) : null}
            {subtitle ? (
              <span className="truncate text-sm font-medium text-gray-600">
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
        {hasBody ? (
          <div className={`mt-0.5 border-t pt-2 ${colors.border}`}>
            <div className="text-sm text-gray-700">{children}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AlertBlock;
