import type { EventData, TimeLike } from '@itinerary-md/core';
import { formatDateTime, getDayOffset } from '@itinerary-md/core';
import { MapPin as Activity, Bed, Building, Bus, Camera, Car, Coffee, Landmark, Plane, Ship, ShoppingBag, Sparkles, Train, TreePine, UtensilsCrossed } from 'lucide-react';

import { AirlineLogo } from './AirlineLogo';
import { Location } from './Location';
import { Route } from './Route';
import { SegmentedText } from './SegmentedText';
import { isAllowedHref, isExternalHttpUrl } from '../../utils/url';

interface ItemProps {
    eventData: EventData;
    dateStr?: string;
    timezone?: string;
    currency?: string;
    extraLinks?: Array<{ label: string; url: string }>;
    nameSegments?: Array<{ text: string; url?: string }>;
    departureSegments?: Array<{ text: string; url?: string }>;
    arrivalSegments?: Array<{ text: string; url?: string }>;
}

const getTypeColors = (type: EventData['type']) => {
    switch (type) {
        case 'flight':
            return {
                text: '!text-red-600',
                border: 'border-red-200',
                bgColor: 'bg-red-500',
                borderColor: 'border-l-red-500',
                cardBg: 'bg-red-50',
                cardBorder: 'border-red-200',
            };
        case 'train':
            return {
                text: '!text-green-600',
                border: 'border-green-200',
                bgColor: 'bg-green-600',
                borderColor: 'border-l-green-600',
                cardBg: 'bg-green-50',
                cardBorder: 'border-green-200',
            };
        case 'drive':
            return {
                text: '!text-yellow-600',
                border: 'border-yellow-200',
                bgColor: 'bg-yellow-600',
                borderColor: 'border-l-yellow-600',
                cardBg: 'bg-yellow-50',
                cardBorder: 'border-yellow-200',
            };
        case 'ferry':
            return {
                text: '!text-cyan-600',
                border: 'border-cyan-200',
                bgColor: 'bg-cyan-600',
                borderColor: 'border-l-cyan-600',
                cardBg: 'bg-cyan-50',
                cardBorder: 'border-cyan-200',
            };
        case 'bus':
            return {
                text: '!text-orange-600',
                border: 'border-orange-200',
                bgColor: 'bg-orange-600',
                borderColor: 'border-l-orange-600',
                cardBg: 'bg-orange-50',
                cardBorder: 'border-orange-200',
            };
        case 'taxi':
            return {
                text: '!text-lime-600',
                border: 'border-lime-200',
                bgColor: 'bg-lime-600',
                borderColor: 'border-l-lime-600',
                cardBg: 'bg-lime-50',
                cardBorder: 'border-lime-200',
            };
        case 'subway':
            return {
                text: '!text-teal-600',
                border: 'border-teal-200',
                bgColor: 'bg-teal-600',
                borderColor: 'border-l-teal-600',
                cardBg: 'bg-teal-50',
                cardBorder: 'border-teal-200',
            };
        case 'stay':
        case 'hotel':
            return {
                text: '!text-purple-600',
                border: 'border-purple-200',
                bgColor: 'bg-purple-600',
                borderColor: 'border-l-purple-600',
                cardBg: 'bg-purple-50',
                cardBorder: 'border-purple-200',
            };
        case 'dormitory':
        case 'hostel':
            return {
                text: '!text-indigo-600',
                border: 'border-indigo-200',
                bgColor: 'bg-indigo-600',
                borderColor: 'border-l-indigo-600',
                cardBg: 'bg-indigo-50',
                cardBorder: 'border-indigo-200',
            };
        case 'ryokan':
            return {
                text: '!text-red-700',
                border: 'border-red-300',
                bgColor: 'bg-red-700',
                borderColor: 'border-l-red-700',
                cardBg: 'bg-red-100',
                cardBorder: 'border-red-300',
            };
        case 'meal':
        case 'lunch':
        case 'dinner':
        case 'breakfast':
        case 'brunch':
            return {
                text: '!text-orange-600',
                border: 'border-orange-200',
                bgColor: 'bg-orange-600',
                borderColor: 'border-l-orange-600',
                cardBg: 'bg-orange-50',
                cardBorder: 'border-orange-200',
            };
        case 'activity':
            return {
                text: '!text-blue-600',
                border: 'border-blue-200',
                bgColor: 'bg-blue-600',
                borderColor: 'border-l-blue-600',
                cardBg: 'bg-blue-50',
                cardBorder: 'border-blue-200',
            };
        case 'museum':
            return {
                text: '!text-indigo-600',
                border: 'border-indigo-200',
                bgColor: 'bg-indigo-600',
                borderColor: 'border-l-indigo-600',
                cardBg: 'bg-indigo-50',
                cardBorder: 'border-indigo-200',
            };
        case 'sightseeing':
            return {
                text: '!text-pink-600',
                border: 'border-pink-200',
                bgColor: 'bg-pink-600',
                borderColor: 'border-l-pink-600',
                cardBg: 'bg-pink-50',
                cardBorder: 'border-pink-200',
            };
        case 'shopping':
            return {
                text: '!text-violet-600',
                border: 'border-violet-200',
                bgColor: 'bg-violet-600',
                borderColor: 'border-l-violet-600',
                cardBg: 'bg-violet-50',
                cardBorder: 'border-violet-200',
            };
        case 'spa':
            return {
                text: '!text-emerald-600',
                border: 'border-emerald-200',
                bgColor: 'bg-emerald-600',
                borderColor: 'border-l-emerald-600',
                cardBg: 'bg-emerald-50',
                cardBorder: 'border-emerald-200',
            };
        case 'park':
            return {
                text: '!text-green-700',
                border: 'border-green-300',
                bgColor: 'bg-green-700',
                borderColor: 'border-l-green-700',
                cardBg: 'bg-green-100',
                cardBorder: 'border-green-300',
            };
        case 'cafe':
            return {
                text: '!text-amber-600',
                border: 'border-amber-200',
                bgColor: 'bg-amber-600',
                borderColor: 'border-l-amber-600',
                cardBg: 'bg-amber-50',
                cardBorder: 'border-amber-200',
            };
        default:
            return {
                text: '!text-gray-600',
                border: 'border-gray-200',
                bgColor: 'bg-gray-600',
                borderColor: 'border-l-gray-600',
                cardBg: 'bg-gray-50',
                cardBorder: 'border-gray-200',
            };
    }
};

const getTypeIcon = (type: EventData['type']) => {
    switch (type) {
        case 'flight':
            return Plane;
        case 'train':
            return Train;
        case 'drive':
            return Car;
        case 'ferry':
            return Ship;
        case 'bus':
            return Bus;
        case 'taxi':
            return Car;
        case 'subway':
            return Train;
        case 'stay':
        case 'hotel':
            return Building;
        case 'dormitory':
        case 'hostel':
            return Bed;
        case 'ryokan':
            return Landmark;
        case 'meal':
        case 'lunch':
        case 'dinner':
        case 'breakfast':
        case 'brunch':
            return UtensilsCrossed;
        case 'activity':
            return Activity;
        case 'museum':
            return Landmark;
        case 'sightseeing':
            return Camera;
        case 'shopping':
            return ShoppingBag;
        case 'spa':
            return Sparkles;
        case 'park':
            return TreePine;
        case 'cafe':
            return Coffee;
        default:
            return Activity;
    }
};

const TimePlaceholder: React.FC = () => <span className="font-mono text-lg leading-tight relative inline-block invisible">-----</span>;

const TimeDisplay: React.FC<{
    parsedTime?: TimeLike;
    dateStr?: string;
    timezone?: string;
}> = ({ parsedTime, dateStr, timezone }) => {
    if (!parsedTime) {
        return <span className="font-mono text-lg leading-tight relative inline-block invisible">-----</span>;
    }

    if (parsedTime.kind === 'placeholder') {
        const label = parsedTime.value === 'am' ? 'AM' : 'PM';
        return <span className="font-mono text-lg leading-tight inline-block whitespace-pre">{label.padStart(5, ' ')}</span>;
    }

    const displayTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date(parsedTime.epochMs);
    const timeText = formatDateTime(date, displayTz);

    const dayOffset = dateStr && displayTz ? getDayOffset(date, dateStr, displayTz) : 0;
    const plusBadge = dayOffset !== 0 ? `${dayOffset > 0 ? '+' : ''}${dayOffset}d` : '';

    return (
        <span className="font-mono text-lg text-gray-800 leading-tight relative inline-block">
            {timeText}
            {plusBadge && <span className="absolute -bottom-3 -right-0 text-xs font-bold text-white bg-red-500 rounded px-0.5 ">{plusBadge}</span>}
        </span>
    );
};

import { Meta } from './Metadata';

export const Item: React.FC<ItemProps> = ({ eventData, dateStr, timezone, currency, extraLinks, nameSegments, departureSegments, arrivalSegments }) => {
    const colors = getTypeColors(eventData.type);
    const IconComponent = getTypeIcon(eventData.type);
    // mainTitle はnameSegmentsから取得されるため不要

    const routeOrLocationDisplay = (() => {
        if (eventData.baseType === 'transportation' && (departureSegments?.length || arrivalSegments?.length)) {
            return <Route departureSegments={departureSegments} arrivalSegments={arrivalSegments} />;
        }
        if ((eventData.baseType === 'stay' || eventData.baseType === 'activity') && arrivalSegments?.length) {
            return <Location segments={arrivalSegments} />;
        }
        return null;
    })();

    return (
        <div className="my-3 flex items-center">
            {!eventData.timeRange?.start && !eventData.timeRange?.end ? (
                <TimePlaceholder />
            ) : (
                <div className="flex flex-col gap-5 min-w-0 text-right">
                    {eventData.timeRange?.start ? <TimeDisplay parsedTime={eventData.timeRange.start} dateStr={dateStr} timezone={timezone} /> : <TimePlaceholder />}
                    {eventData.timeRange?.end && <TimeDisplay parsedTime={eventData.timeRange.end} dateStr={dateStr} timezone={timezone} />}
                </div>
            )}

            <div className="flex items-center justify-center relative z-10 ml-3">
                <div className={`flex items-center justify-center w-8 h-8 ${colors.bgColor} rounded-full `}>
                    <IconComponent size={20} className="text-white" />
                </div>
            </div>

            <div className={`flex-1 min-w-0 p-5 ${colors.cardBg} ${colors.cardBorder} border-l-4 ${colors.borderColor} -ml-4.5 pl-8`}>
                <div className="flex items-center gap-x-3 flex-wrap">
                    {eventData.type === 'flight' && 'name' in eventData && eventData.name && <AirlineLogo flightCode={eventData.name} size={24} />}
                    {nameSegments && nameSegments.length > 0 && <SegmentedText segments={nameSegments} className={`font-bold ${colors.text} text-lg`} linkClassName="underline text-inherit" />}
                    {routeOrLocationDisplay && <div className="text-gray-700 text-sm font-medium">{routeOrLocationDisplay}</div>}
                    {Array.isArray(extraLinks) && extraLinks.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            {extraLinks
                                .filter((l) => l && typeof l.url === 'string' && isAllowedHref(l.url))
                                .map((l, idx) => {
                                    const isExternal = isExternalHttpUrl(l.url);
                                    return (
                                        <a key={`${l.label}-${idx}`} href={l.url} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} className="underline">
                                            {l.label}
                                        </a>
                                    );
                                })}
                        </div>
                    )}
                </div>
                <Meta metadata={eventData.metadata} borderColor={colors.border} currency={currency} />
            </div>
        </div>
    );
};
