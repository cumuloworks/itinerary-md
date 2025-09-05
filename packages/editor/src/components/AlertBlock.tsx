import { AlertCircle, AlertOctagon, AlertTriangle, Info, Lightbulb, type LucideIcon } from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';
import { TimePlaceholder } from './itinerary/TimePlaceholder';

export type AlertVariant = 'note' | 'tip' | 'important' | 'warning' | 'caution';

type AlertBlockProps = {
    variant?: string;
    title?: ReactNode;
    subtitle?: ReactNode;
    children?: ReactNode;
    className?: string;
};

function getIconByVariant(variant?: string): LucideIcon {
    const v = String(variant || '').toLowerCase();
    if (v === 'tip') return Lightbulb;
    if (v === 'warning') return AlertTriangle;
    if (v === 'caution' || v === 'danger') return AlertOctagon;
    if (v === 'important') return AlertCircle;
    return Info; // note/info/default
}

function getStyleByVariant(variant?: string): { text: string; border: string; bgColor: string; borderColor: string; cardBg: string; cardBorder: string } {
    const v = String(variant || '').toLowerCase();
    switch (v) {
        case 'tip':
            return {
                text: 'text-emerald-600',
                border: 'border-emerald-200',
                bgColor: 'bg-emerald-600',
                borderColor: 'border-l-emerald-600',
                cardBg: 'bg-emerald-50',
                cardBorder: 'border-emerald-200',
            };
        case 'warning':
            return {
                text: 'text-amber-600',
                border: 'border-amber-200',
                bgColor: 'bg-amber-600',
                borderColor: 'border-l-amber-600',
                cardBg: 'bg-amber-50',
                cardBorder: 'border-amber-200',
            };
        case 'caution':
            return {
                text: 'text-red-600',
                border: 'border-red-200',
                bgColor: 'bg-red-600',
                borderColor: 'border-l-red-600',
                cardBg: 'bg-red-50',
                cardBorder: 'border-red-200',
            };
        case 'important':
            return {
                text: 'text-purple-600',
                border: 'border-purple-200',
                bgColor: 'bg-purple-600',
                borderColor: 'border-l-purple-600',
                cardBg: 'bg-purple-50',
                cardBorder: 'border-purple-200',
            };
        default:
            return {
                text: 'text-gray-600',
                border: 'border-gray-200',
                bgColor: 'bg-gray-600',
                borderColor: 'border-l-gray-600',
                cardBg: 'bg-gray-50',
                cardBorder: 'border-gray-200',
            };
    }
}

export const AlertBlock: FC<AlertBlockProps> = ({ variant, title, subtitle, children, className }) => {
    const Icon = getIconByVariant(variant);
    const colors = getStyleByVariant(variant);
    const hasBody = React.Children.count(children) > 0;
    return (
        <div className={`my-3 flex items-center ${className || ''}`.trim()}>
            <div className="flex flex-col gap-5 min-w-0 text-right">
                <TimePlaceholder />
            </div>
            <div className="flex items-center justify-center relative z-10 ml-3">
                <div className={`flex items-center justify-center w-8 h-8 ${colors.bgColor} rounded-full`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
            <div className={`flex-1 min-w-0 ${hasBody ? 'p-5' : 'px-5'} ${colors.cardBorder} ${colors.borderColor} -ml-4.5 pl-8`}>
                {title || subtitle ? (
                    <div className="flex items-center gap-2">
                        {title ? <span className={`text-lg font-bold ${colors.text}`}>{title}</span> : null}
                        {subtitle ? <span className="font-medium text-sm text-gray-600 truncate">{subtitle}</span> : null}
                    </div>
                ) : null}
                {hasBody ? (
                    <div className={`pt-2 mt-2 border-t ${colors.border}`}>
                        <div className="text-gray-700 text-sm">{children}</div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default AlertBlock;
