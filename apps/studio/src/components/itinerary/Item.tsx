/**
 * 統一されたディスプレイシステム
 */

import type { EventData, TimeLike } from '@itinerary-md/core';
import { formatDateTime, getDayOffset } from '@itinerary-md/core';
import { MapPin as Activity, Building, Plane, Train, UtensilsCrossed } from 'lucide-react';

import { AirlineLogo } from './AirlineLogo';
import { Location } from './Location';
import { Route } from './Route';

interface ItemProps {
    eventData: EventData;
    dateStr?: string;
    baseTz?: string;
    currency?: string;
}

const getTypeColors = (type: EventData['type']) => {
    switch (type) {
        case 'flight':
            return { text: 'text-red-600', border: 'border-red-200' };
        case 'train':
            return { text: 'text-green-600', border: 'border-green-200' };
        case 'stay':
            return { text: 'text-purple-600', border: 'border-purple-200' };
        case 'meal':
            return { text: 'text-orange-600', border: 'border-orange-200' };
        case 'activity':
            return { text: 'text-blue-600', border: 'border-blue-200' };
        default:
            return { text: 'text-gray-600', border: 'border-gray-200' };
    }
};

const getTypeConfig = (type: ItemProps['eventData']['type']) => {
    switch (type) {
        case 'flight':
            return {
                icon: Plane,
                bgColor: 'bg-red-500',
                borderColor: 'border-l-red-500',
                cardBg: 'bg-red-50',
                cardBorder: 'border-red-200',
            };
        case 'train':
            return {
                icon: Train,
                bgColor: 'bg-green-600',
                borderColor: 'border-l-green-600',
                cardBg: 'bg-green-50',
                cardBorder: 'border-green-200',
            };
        case 'stay':
            return {
                icon: Building,
                bgColor: 'bg-purple-600',
                borderColor: 'border-l-purple-600',
                cardBg: 'bg-purple-50',
                cardBorder: 'border-purple-200',
            };
        case 'meal':
            return {
                icon: UtensilsCrossed,
                bgColor: 'bg-orange-600',
                borderColor: 'border-l-orange-600',
                cardBg: 'bg-orange-50',
                cardBorder: 'border-orange-200',
            };
        case 'activity':
            return {
                icon: Activity,
                bgColor: 'bg-blue-600',
                borderColor: 'border-l-blue-600',
                cardBg: 'bg-blue-50',
                cardBorder: 'border-blue-200',
            };
        default:
            return {
                icon: Activity,
                bgColor: 'bg-gray-600',
                borderColor: 'border-l-gray-600',
                cardBg: 'bg-gray-50',
                cardBorder: 'border-gray-200',
            };
    }
};

const TimePlaceholder: React.FC = () => <span className="font-mono text-lg font-bold leading-tight relative inline-block invisible">-----</span>;

const TimeDisplay: React.FC<{
    parsedTime?: TimeLike;
    dateStr?: string;
    baseTz?: string;
}> = ({ parsedTime, dateStr, baseTz }) => {
    if (!parsedTime) {
        return <span className="font-mono text-lg font-bold leading-tight relative inline-block invisible">-----</span>;
    }

    if (parsedTime.kind === 'placeholder') {
        const label = parsedTime.value === 'am' ? 'AM' : 'PM';
        return <span className="font-mono text-lg font-bold leading-tight inline-block whitespace-pre">{label.padStart(5, ' ')}</span>;
    }

    const displayTz = baseTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date(parsedTime.epochMs);
    const timeText = formatDateTime(date, displayTz);

    const dayOffset = dateStr && baseTz ? getDayOffset(date, dateStr, baseTz) : 0;
    const plusBadge = dayOffset !== 0 ? `${dayOffset > 0 ? '+' : ''}${dayOffset}d` : '';

    return (
        <span className="font-mono text-lg font-bold text-gray-800 leading-tight relative inline-block">
            {timeText}
            {plusBadge && <span className="absolute -bottom-3 -right-0 text-xs font-bold text-white bg-red-500 rounded px-0.5 ">{plusBadge}</span>}
        </span>
    );
};

import { Meta } from './Metadata';

export const Item: React.FC<ItemProps> = ({ eventData, dateStr, baseTz, currency }) => {
    const colors = getTypeColors(eventData.type);
    const config = getTypeConfig(eventData.type);
    const IconComponent = config.icon;
    const mainTitle = (() => {
        switch (eventData.type) {
            case 'flight':
                return eventData.flightCode;
            case 'train':
                return eventData.trainName;
            case 'stay':
                return eventData.stayName;
            case 'meal':
                return eventData.restaurantName;
            case 'activity':
                return eventData.activityName;
            default:
                return '';
        }
    })();

    const routeOrLocationDisplay = (() => {
        if ((eventData.type === 'flight' || eventData.type === 'train') && eventData.departure && eventData.arrival) {
            return <Route departure={eventData.departure} arrival={eventData.arrival} startTime={eventData.timeRange?.start} endTime={eventData.timeRange?.end} />;
        }
        if ((eventData.type === 'stay' || eventData.type === 'meal' || eventData.type === 'activity') && eventData.location) {
            return <Location location={eventData.location} />;
        }
        return null;
    })();

    return (
        <div className="my-3 flex items-center">
            {!eventData.timeRange?.start && !eventData.timeRange?.end ? (
                <TimePlaceholder />
            ) : (
                <div className="flex flex-col gap-5 min-w-0 text-right">
                    {eventData.timeRange?.start ? <TimeDisplay parsedTime={eventData.timeRange.start} dateStr={dateStr} baseTz={baseTz} /> : <TimePlaceholder />}
                    {eventData.timeRange?.end && <TimeDisplay parsedTime={eventData.timeRange.end} dateStr={dateStr} baseTz={baseTz} />}
                </div>
            )}

            <div className="flex items-center justify-center relative z-10 ml-3">
                <div className={`flex items-center justify-center w-8 h-8 ${config.bgColor} rounded-full `}>
                    <IconComponent size={20} className="text-white" />
                </div>
            </div>

            <div className={`flex-1 min-w-0 p-5 ${config.cardBg} ${config.cardBorder} border-l-4 ${config.borderColor} -ml-4.5 pl-8`}>
                <div className="flex items-center gap-x-3 flex-wrap">
                    {eventData.type === 'flight' && eventData.airlineCode && <AirlineLogo airlineCode={eventData.airlineCode} size={24} />}
                    <span className={`font-bold ${colors.text} text-lg`}>{mainTitle}</span>
                    {routeOrLocationDisplay && <div className="text-gray-700 text-sm font-medium">{routeOrLocationDisplay}</div>}
                </div>
                <Meta metadata={eventData.metadata} borderColor={colors.border} currency={currency} />
            </div>
        </div>
    );
};
