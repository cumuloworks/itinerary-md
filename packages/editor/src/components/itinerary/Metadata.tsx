//
import type React from 'react';
import { IconLabelText } from '@/components/itinerary/IconLabelText';
import { getMetadataConfig } from '@/components/itinerary/iconMaps';
import type { TextSegment } from '@/components/itinerary/SegmentedText';

// getMetadataConfig is consumed from a shared module

export type MetaProps = {
    metaKey: string;
    segments: TextSegment[];
    className?: string;
};

export const Meta: React.FC<MetaProps> = ({ metaKey, segments, className }) => {
    const config = getMetadataConfig(metaKey);
    const IconComponent = config.icon;
    return <IconLabelText icon={IconComponent} label={config.label} segments={segments} className={className} />;
};
