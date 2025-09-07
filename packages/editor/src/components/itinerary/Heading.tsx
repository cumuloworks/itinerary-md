import { DateTime } from 'luxon';
import type React from 'react';
import { Location } from '@/components/itinerary/Location';
import type { TextSegment } from '@/components/itinerary/SegmentedText';

interface HeadingProps {
    date: string;
    timezone?: string;
    prevStaySegments?: TextSegment[];
}

const getDayOfWeekColorClass = (dayOfWeek: string) => {
    switch (dayOfWeek) {
        case 'Sat':
            return 'text-blue-600';
        case 'Sun':
            return 'text-red-600';
        default:
            return 'text-gray-600';
    }
};

export const Heading: React.FC<HeadingProps> = ({ date, timezone, prevStaySegments }) => {
    const dt = DateTime.fromISO(date, { zone: timezone || 'UTC' });
    const dayOfWeek = dt.isValid ? dt.setLocale('en').toFormat('ccc') : '';
    return (
        <h2 className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-2 text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6">
            <span className="flex items-center">
                <span className="text-2xl whitespace-nowrap">{date}</span>
                <span className={`whitespace-nowrap ml-2 text-sm px-2 py-0.5 bg-gray-200 ${getDayOfWeekColorClass(dayOfWeek)}`}>{dayOfWeek}</span>
                {timezone && <span className="whitespace-nowrap ml-3 text-xs text-gray-500 font-normal">({timezone})</span>}
            </span>
            {prevStaySegments && prevStaySegments.length > 0 ? (
                <span className="flex items-center text-gray-700 text-sm gap-2">
                    <Location segments={prevStaySegments} />
                </span>
            ) : null}
        </h2>
    );
};
