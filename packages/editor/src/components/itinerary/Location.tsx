import type React from 'react';
import { SegmentedText, type TextSegment } from '@/components/itinerary/SegmentedText';
import { buildGoogleMapsSearchUrl } from '@/utils/url';

export interface LocationProps {
    segments?: TextSegment[];
    className?: string;
    linkClassName?: string;
}

export const Location: React.FC<LocationProps> = ({ segments, className, linkClassName }) => {
    if (!segments || segments.length === 0) return null;

    const hasValidUrl = segments.some((seg) => seg.url && seg.url.trim() !== '');

    const finalSegments: TextSegment[] = (() => {
        if (hasValidUrl) return segments;
        const fullText = segments
            .map((s) => s.text)
            .join('')
            .trim();
        if (fullText === '') return segments;
        return [{ text: fullText, url: buildGoogleMapsSearchUrl(fullText) }];
    })();

    return <SegmentedText segments={finalSegments} className={className || 'break-all'} linkClassName={linkClassName || 'underline'} />;
};
