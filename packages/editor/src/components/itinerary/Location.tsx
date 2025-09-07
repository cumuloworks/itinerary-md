import { MapPin } from 'lucide-react';
import type React from 'react';
import { SegmentedText, type TextSegment } from '@/components/itinerary/SegmentedText';
import { buildGoogleMapsSearchUrl, isAllowedHref } from '@/utils/url';

interface LocationProps {
    location?: string;
    url?: string;
    segments?: TextSegment[];
}

export const Location: React.FC<LocationProps> = ({ location, url, segments }) => {
    if (!location && (!segments || segments.length === 0)) return null;

    // フォールバック可否は URL の有無でのみ判定（許可可否とは切り離す）
    const userProvidedUrl = Boolean(
        (url && url.trim()) ||
            (segments && segments.some((s) => s.url && s.url.trim() !== ''))
    );

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

    const hasValidUrl = finalSegments.some((seg) => seg.url && seg.url.trim() !== '');
    if (!userProvidedUrl && !hasValidUrl) {
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
