import { MapPin } from 'lucide-react';
import type React from 'react';
import { buildGoogleMapsSearchUrl, isAllowedHref } from '../../utils/url';
import { SegmentedText, type TextSegment } from './SegmentedText';

interface LocationProps {
    location?: string;
    url?: string;
    segments?: TextSegment[];
}

export const Location: React.FC<LocationProps> = ({ location, url, segments }) => {
    if (!location && (!segments || segments.length === 0)) return null;

    const finalSegments: TextSegment[] = (() => {
        if (segments && segments.length > 0) {
            return segments;
        }

        if (location) {
            if (url && isAllowedHref(url)) {
                return [{ text: location, url }];
            }
            return [{ text: location }];
        }

        return [];
    })();

    if (finalSegments.length === 0) return null;

    const hasUrl = finalSegments.some((seg) => seg.url && seg.url.trim() !== '');
    if (!hasUrl) {
        const fullText = finalSegments.map((s) => s.text).join('');
        const googleMapsUrl = buildGoogleMapsSearchUrl(fullText);
        const googleMapsSegments: TextSegment[] = [{ text: fullText, url: googleMapsUrl }];

        return (
            <span className="flex items-center">
                <MapPin size={14} className="mr-1 text-gray-500 shrink-0" />
                <SegmentedText segments={googleMapsSegments} className="break-all" linkClassName="underline" />
            </span>
        );
    }

    return (
        <span className="flex items-center">
            <MapPin size={14} className="mr-1 text-gray-500 shrink-0" />
            <SegmentedText segments={finalSegments} className="break-all" linkClassName="underline" />
        </span>
    );
};
