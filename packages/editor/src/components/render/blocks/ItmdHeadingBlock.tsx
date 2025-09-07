import { DateTime } from 'luxon';
import type React from 'react';
import { Heading } from '@/components/itinerary/Heading';
import { mergeClassNames } from '@/components/render/utils';

export const ItmdHeadingBlock: React.FC<{
    node: any;
    commonDataProps: any;
    lastStaySegmentsByDate: Map<string, Array<{ text: string; url?: string }>>;
}> = ({ node, commonDataProps, lastStaySegmentsByDate }) => {
    const d = node as { dateISO?: string; timezone?: string };
    const date = d?.dateISO;
    const tz = d?.timezone;
    if (!date) return null;
    const prevStaySegments = (() => {
        try {
            const zone = tz || 'UTC';
            const dt = DateTime.fromISO(date, { zone });
            const prevISO = dt.minus({ days: 1 }).toISODate();
            return prevISO ? lastStaySegmentsByDate.get(prevISO) : undefined;
        } catch {
            return undefined;
        }
    })();
    const { className: extraClass, ...rest } = commonDataProps || {};
    const mergedClassName = mergeClassNames('contents', extraClass as string | undefined);
    return (
        <div className={mergedClassName} {...rest}>
            <Heading date={date} timezone={tz} prevStaySegments={prevStaySegments} />
        </div>
    );
};
