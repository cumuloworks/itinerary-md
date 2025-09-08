import type React from 'react';
import { IconLabelText } from '@/components/itinerary/IconLabelText';
import { getMetadataConfig } from '@/components/itinerary/iconMaps';
import type { TextSegment } from '@/components/itinerary/SegmentedText';

export const Price: React.FC<{
    kind: 'price' | 'cost';
    display?: string;
    segments: TextSegment[];
    warnings?: string[];
}> = ({ kind, display, segments, warnings }) => {
    const cfg = getMetadataConfig(kind);
    const Icon = cfg.icon;
    const hasError = Array.isArray(warnings) && warnings.length > 0;
    const textClassName = hasError ? 'ml-1 underline decoration-wavy decoration-red-500 decoration-from-font underline-offset-2' : undefined;
    const title = hasError ? warnings?.join(', ') : undefined;

    if (display) {
        return <IconLabelText icon={Icon} label={undefined} segments={[{ text: display }]} className="text-emerald-600 text-sm font-bold flex items-center" iconSize={14} iconClassName="mr-1" textClassName={textClassName} title={title} />;
    }

    return <IconLabelText icon={Icon} label={undefined} segments={segments} className="text-emerald-600 text-sm font-bold flex items-center" iconSize={14} iconClassName="mr-1" textClassName={textClassName} title={title} />;
};

export default Price;
