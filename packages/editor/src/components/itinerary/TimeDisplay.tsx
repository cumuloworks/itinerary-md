import type React from 'react';

import { formatDateTime, getDayOffset } from '@/utils/timezone';

export const TimeDisplay: React.FC<{
  iso?: string | null;
  marker?: 'am' | 'pm' | null;
  dateStr?: string;
  timezone?: string;
}> = ({ iso, marker, dateStr, timezone }) => {
  if (!iso && !marker) {
    return (
      <span className="invisible relative inline-block font-mono text-lg leading-tight font-medium">
        -----
      </span>
    );
  }

  if (marker) {
    const label = marker === 'am' ? 'AM' : 'PM';
    return (
      <span className="inline-block font-mono text-lg leading-tight font-medium whitespace-pre">
        {label.padStart(5, ' ')}
      </span>
    );
  }

  const displayTz =
    timezone ||
    (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');
  const date = iso ? new Date(iso) : undefined;
  if (!date || Number.isNaN(date.getTime())) {
    return (
      <span className="invisible relative inline-block font-mono text-lg leading-tight font-medium">
        -----
      </span>
    );
  }
  const timeText = formatDateTime(date, displayTz);

  const dayOffset =
    dateStr && displayTz ? getDayOffset(date, dateStr, displayTz) : 0;
  const plusBadge =
    dayOffset !== 0 ? `${dayOffset > 0 ? '+' : ''}${dayOffset}d` : '';

  return (
    <span className="relative inline-block font-mono text-lg leading-tight font-medium text-gray-800">
      {timeText}
      {plusBadge && (
        <span className="absolute -right-0 -bottom-3 rounded bg-red-500 px-0.5 text-xs font-medium text-white">
          {plusBadge}
        </span>
      )}
    </span>
  );
};

export default TimeDisplay;
