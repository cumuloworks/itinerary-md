import type React from 'react';
import { formatDateTime, getDayOffset } from '@/utils/timezone';

export const TimeDisplay: React.FC<{
    iso?: string | null;
    marker?: 'am' | 'pm' | null;
    dateStr?: string;
    timezone?: string;
}> = ({ iso, marker, dateStr, timezone }) => {
    if (!iso && !marker) {
        return <span className="font-mono font-medium text-lg leading-tight relative inline-block invisible">-----</span>;
    }

    if (marker) {
        const label = marker === 'am' ? 'AM' : 'PM';
        return <span className="font-mono font-medium text-lg leading-tight inline-block whitespace-pre">{label.padStart(5, ' ')}</span>;
    }

    const displayTz = timezone || (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
    const date = iso ? new Date(iso) : undefined;
    if (!date || Number.isNaN(date.getTime())) {
        return <span className="font-mono font-medium text-lg leading-tight relative inline-block invisible">-----</span>;
    }
    const timeText = formatDateTime(date, displayTz);

    const dayOffset = dateStr && displayTz ? getDayOffset(date, dateStr, displayTz) : 0;
    const plusBadge = dayOffset !== 0 ? `${dayOffset > 0 ? '+' : ''}${dayOffset}d` : '';

    return (
        <span className="font-mono font-medium text-lg text-gray-800 leading-tight relative inline-block">
            {timeText}
            {plusBadge && <span className="absolute -bottom-3 -right-0 text-xs font-medium text-white bg-red-500 rounded px-0.5">{plusBadge}</span>}
        </span>
    );
};

export default TimeDisplay;
