import { DateTime } from 'luxon';
import type React from 'react';

import { getIconForEventType } from '@/components/itinerary/iconMaps';
import { Location } from '@/components/itinerary/Location';
import type { TextSegment } from '@/components/itinerary/SegmentedText';

const StayIcon = getIconForEventType('stay');

interface HeadingProps {
  date: string;
  timezone?: string;
  prevStaySegments?: TextSegment[];
  onTimezoneClick?: (timezone: string) => void;
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

export const Heading: React.FC<HeadingProps> = ({
  date,
  timezone,
  prevStaySegments,
  onTimezoneClick,
}) => {
  const dt = DateTime.fromISO(date, { zone: timezone || 'UTC' });
  const dayOfWeek = dt.isValid ? dt.setLocale('en').toFormat('ccc') : '';
  return (
    <h2 className="mt-8 mb-6 flex flex-col gap-y-2 border-b-2 border-blue-200 pb-3 text-xl font-semibold text-blue-700 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center">
        <span className="text-2xl whitespace-nowrap">{date}</span>
        <span
          className={`ml-2 bg-gray-200 px-2 py-0.5 text-sm whitespace-nowrap ${getDayOfWeekColorClass(dayOfWeek)}`}
        >
          {dayOfWeek}
        </span>
        {timezone && (
          <button
            type="button"
            className="ml-3 cursor-pointer text-xs font-normal whitespace-nowrap text-gray-500 hover:underline"
            onClick={() => onTimezoneClick?.(timezone)}
          >
            ({timezone})
          </button>
        )}
      </span>
      {prevStaySegments && prevStaySegments.length > 0 ? (
        <span className="flex items-center gap-2 text-sm text-gray-700">
          <StayIcon className="size-4 text-gray-500" />
          <Location
            segments={prevStaySegments}
            className="text-sm font-semibold text-gray-800"
          />
        </span>
      ) : null}
    </h2>
  );
};
