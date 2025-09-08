//
import type React from 'react';
import { IconLabelText } from '@/components/itinerary/IconLabelText';
import { getMetadataConfig } from '@/components/itinerary/iconMaps';
import type { TextSegment } from '@/components/itinerary/SegmentedText';
import { isAllowedHref } from '@/utils/url';

// getMetadataConfig is consumed from a shared module

export const Meta: React.FC<{
    metadata?: Record<string, string>;
    entries?: Array<{ key: string; segments: TextSegment[] }>;
}> = ({ metadata = {}, entries: entriesProp }) => {
    const entries = entriesProp
        ? entriesProp.map((e) => [e.key, e.segments.map((s) => s.text).join('')] as [string, string])
        : Object.entries(metadata).filter(([key]) => !key.endsWith('__url') && !key.endsWith('__link_label') && !key.endsWith('__segments'));

    if (entries.length === 0) return null;
    return (
        <div className={`flex flex-wrap gap-x-2`}>
            {entries.map(([key, value], idx) => {
                const config = getMetadataConfig(key);
                const IconComponent = config.icon;
                const segments: TextSegment[] = (() => {
                    if (Array.isArray(entriesProp)) {
                        const found = entriesProp[idx];
                        if (found && found.key === key) return found.segments;
                    }
                    const segmentsJson = metadata?.[`${key}__segments` as keyof typeof metadata] as unknown as string | undefined;
                    if (segmentsJson) {
                        try {
                            return JSON.parse(segmentsJson);
                        } catch {}
                    }
                    const maybeUrl = metadata?.[`${key}__url` as keyof typeof metadata] as unknown as string | undefined;
                    if (maybeUrl && isAllowedHref(maybeUrl)) return [{ text: value, url: maybeUrl }];
                    return [{ text: value }];
                })();
                return <IconLabelText key={key} icon={IconComponent} label={config.label} segments={segments} />;
            })}
        </div>
    );
};
