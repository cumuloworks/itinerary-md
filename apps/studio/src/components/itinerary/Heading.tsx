import { Hotel } from 'lucide-react';
import { DateTime } from 'luxon';
import type React from 'react';

interface HeadingProps {
    date: string;
    timezone?: string;
    prevStayName?: string;
}

export const Heading: React.FC<HeadingProps> = ({ date, timezone, prevStayName }) => {
    const dayOfWeek = DateTime.fromISO(date, { zone: timezone || 'UTC' })
        .setLocale('en')
        .toFormat('ccc');

    return (
        <h2 className="text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-3 mt-8 mb-6 flex items-center justify-between">
            <span className="flex items-center">
                <span className="text-2xl">{date}</span>
                <span className="ml-2 text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-md">{dayOfWeek}</span>
                {timezone && <span className="ml-3 text-base text-gray-500 font-normal">({timezone})</span>}
            </span>
            {prevStayName && (
                <span className="flex items-center text-gray-700 text-base gap-2">
                    <span className="rounded-full flex items-center justify-center p-1.5 aspect-square bg-purple-500">
                        <Hotel size={18} className="text-white" />
                    </span>
                    <span className="font-semibold">{prevStayName}</span>
                </span>
            )}
        </h2>
    );
};
