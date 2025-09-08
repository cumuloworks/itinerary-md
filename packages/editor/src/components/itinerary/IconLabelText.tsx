import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import { SegmentedText, type TextSegment } from '@/components/itinerary/SegmentedText';

export type IconLabelTextProps = {
    icon: LucideIcon;
    label?: string;
    labelSuffix?: string; // e.g. ':'
    segments?: TextSegment[];
    className?: string;
    iconSize?: number;
    iconClassName?: string;
    labelClassName?: string;
    textClassName?: string;
    linkClassName?: string;
    title?: string;
};

export const IconLabelText: React.FC<IconLabelTextProps> = ({
    icon: Icon,
    label,
    labelSuffix = ':',
    segments,
    className = 'text-gray-600 text-sm flex items-center',
    iconSize = 14,
    iconClassName = 'mr-1',
    labelClassName = 'font-medium',
    textClassName = 'ml-1',
    linkClassName = 'underline text-inherit',
    title,
}) => {
    return (
        <div className={className}>
            <Icon size={iconSize} className={iconClassName} />
            {label ? (
                <span className={labelClassName}>
                    {label}
                    {labelSuffix}
                </span>
            ) : null}
            <SegmentedText segments={segments} className={textClassName} linkClassName={linkClassName} title={title} />
        </div>
    );
};

export default IconLabelText;
