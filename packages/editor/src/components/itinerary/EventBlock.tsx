//
import { formatDateTime, getDayOffset } from '../../utils/timezone';
import { isAllowedHref } from '../../utils/url';
import { AirlineLogo } from './AirlineLogo';
import { Location } from './Location';
import { Route } from './Route';
import { SegmentedText } from './SegmentedText';

interface EventBlockProps {
    eventData: {
        baseType: 'transportation' | 'stay' | 'activity';
        type:
            | 'flight'
            | 'train'
            | 'drive'
            | 'ferry'
            | 'bus'
            | 'taxi'
            | 'subway'
            | 'stay'
            | 'dormitory'
            | 'hotel'
            | 'hostel'
            | 'ryokan'
            | 'meal'
            | 'lunch'
            | 'dinner'
            | 'breakfast'
            | 'brunch'
            | 'activity'
            | 'museum'
            | 'sightseeing'
            | 'shopping'
            | 'spa'
            | 'park'
            | 'cafe';
        name?: string;
        stayName?: string;
        departure?: string;
        arrival?: string;
        location?: string;
        metadata: Record<string, string>;
    };
    dateStr?: string;
    timezone?: string;
    currency?: string;
    priceInfos?: Array<{ key: string; currency: string; amount: number }>;
    extraLinks?: Array<{ label: string; url: string }>;
    nameSegments?: Array<{ text: string; url?: string }>;
    departureSegments?: Array<{ text: string; url?: string }>;
    arrivalSegments?: Array<{ text: string; url?: string }>;
    startISO?: string | null;
    endISO?: string | null;
    marker?: 'am' | 'pm' | null;
    bodySegments?: Array<
        | { kind: 'inline'; segments: Array<{ text: string; url?: string }> }
        | { kind: 'meta'; entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> }
        | { kind: 'list'; items: Array<Array<{ text: string; url?: string }>>; ordered?: boolean; start?: number | null }
    >;
}

function capitalize(s: string): string {
    return s ? s.slice(0, 1).toUpperCase() + s.slice(1) : s;
}

const getTypeColors = (type: EventBlockProps['eventData']['type']) => {
    switch (type) {
        case 'flight':
            return {
                text: 'text-red-600',
                border: 'border-red-200',
                bgColor: 'bg-red-500',
                borderColor: 'border-l-red-500',
                cardBg: 'bg-red-50',
                cardBorder: 'border-red-200',
            };
        case 'train':
            return {
                text: 'text-green-600',
                border: 'border-green-200',
                bgColor: 'bg-green-600',
                borderColor: 'border-l-green-600',
                cardBg: 'bg-green-50',
                cardBorder: 'border-green-200',
            };
        case 'drive':
            return {
                text: 'text-yellow-600',
                border: 'border-yellow-200',
                bgColor: 'bg-yellow-600',
                borderColor: 'border-l-yellow-600',
                cardBg: 'bg-yellow-50',
                cardBorder: 'border-yellow-200',
            };
        case 'ferry':
            return {
                text: 'text-cyan-600',
                border: 'border-cyan-200',
                bgColor: 'bg-cyan-600',
                borderColor: 'border-l-cyan-600',
                cardBg: 'bg-cyan-50',
                cardBorder: 'border-cyan-200',
            };
        case 'bus':
            return {
                text: 'text-orange-600',
                border: 'border-orange-200',
                bgColor: 'bg-orange-600',
                borderColor: 'border-l-orange-600',
                cardBg: 'bg-orange-50',
                cardBorder: 'border-orange-200',
            };
        case 'taxi':
            return {
                text: 'text-lime-600',
                border: 'border-lime-200',
                bgColor: 'bg-lime-600',
                borderColor: 'border-l-lime-600',
                cardBg: 'bg-lime-50',
                cardBorder: 'border-lime-200',
            };
        case 'subway':
            return {
                text: 'text-teal-600',
                border: 'border-teal-200',
                bgColor: 'bg-teal-600',
                borderColor: 'border-l-teal-600',
                cardBg: 'bg-teal-50',
                cardBorder: 'border-teal-200',
            };
        case 'stay':
        case 'hotel':
            return {
                text: 'text-purple-600',
                border: 'border-purple-200',
                bgColor: 'bg-purple-600',
                borderColor: 'border-l-purple-600',
                cardBg: 'bg-purple-50',
                cardBorder: 'border-purple-200',
            };
        case 'dormitory':
        case 'hostel':
            return {
                text: 'text-indigo-600',
                border: 'border-indigo-200',
                bgColor: 'bg-indigo-600',
                borderColor: 'border-l-indigo-600',
                cardBg: 'bg-indigo-50',
                cardBorder: 'border-indigo-200',
            };
        case 'ryokan':
            return {
                text: 'text-red-700',
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
                text: 'text-orange-600',
                border: 'border-orange-200',
                bgColor: 'bg-orange-600',
                borderColor: 'border-l-orange-600',
                cardBg: 'bg-orange-50',
                cardBorder: 'border-orange-200',
            };
        case 'activity':
            return {
                text: 'text-blue-600',
                border: 'border-blue-200',
                bgColor: 'bg-blue-600',
                borderColor: 'border-l-blue-600',
                cardBg: 'bg-blue-50',
                cardBorder: 'border-blue-200',
            };
        case 'museum':
            return {
                text: 'text-indigo-600',
                border: 'border-indigo-200',
                bgColor: 'bg-indigo-600',
                borderColor: 'border-l-indigo-600',
                cardBg: 'bg-indigo-50',
                cardBorder: 'border-indigo-200',
            };
        case 'sightseeing':
            return {
                text: 'text-pink-600',
                border: 'border-pink-200',
                bgColor: 'bg-pink-600',
                borderColor: 'border-l-pink-600',
                cardBg: 'bg-pink-50',
                cardBorder: 'border-pink-200',
            };
        case 'shopping':
            return {
                text: 'text-violet-600',
                border: 'border-violet-200',
                bgColor: 'bg-violet-600',
                borderColor: 'border-l-violet-600',
                cardBg: 'bg-violet-50',
                cardBorder: 'border-violet-200',
            };
        case 'spa':
            return {
                text: 'text-emerald-600',
                border: 'border-emerald-200',
                bgColor: 'bg-emerald-600',
                borderColor: 'border-l-emerald-600',
                cardBg: 'bg-emerald-50',
                cardBorder: 'border-emerald-200',
            };
        case 'park':
            return {
                text: 'text-green-700',
                border: 'border-green-300',
                bgColor: 'bg-green-700',
                borderColor: 'border-l-green-700',
                cardBg: 'bg-green-100',
                cardBorder: 'border-green-300',
            };
        case 'cafe':
            return {
                text: 'text-amber-600',
                border: 'border-amber-200',
                bgColor: 'bg-amber-600',
                borderColor: 'border-l-amber-600',
                cardBg: 'bg-amber-50',
                cardBorder: 'border-amber-200',
            };
        default:
            return {
                text: 'text-gray-600',
                border: 'border-gray-200',
                bgColor: 'bg-gray-600',
                borderColor: 'border-l-gray-600',
                cardBg: 'bg-gray-50',
                cardBorder: 'border-gray-200',
            };
    }
};

import { getIconForEventType } from './iconMaps';

const getTypeIcon = (type: EventBlockProps['eventData']['type']) => getIconForEventType(type);

const TimePlaceholder: React.FC = () => <span className="font-mono text-lg leading-tight relative inline-block invisible">-----</span>;

const TimeDisplay: React.FC<{
    iso?: string | null;
    marker?: 'am' | 'pm' | null;
    dateStr?: string;
    timezone?: string;
}> = ({ iso, marker, dateStr, timezone }) => {
    if (!iso && !marker) {
        return <span className="font-mono text-lg leading-tight relative inline-block invisible">-----</span>;
    }

    if (marker) {
        const label = marker === 'am' ? 'AM' : 'PM';
        return <span className="font-mono text-lg leading-tight inline-block whitespace-pre">{label.padStart(5, ' ')}</span>;
    }

    const displayTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = iso ? new Date(iso) : undefined;
    if (!date || Number.isNaN(date.getTime())) {
        return <span className="font-mono text-lg leading-tight relative inline-block invisible">-----</span>;
    }
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

export const EventBlock: React.FC<EventBlockProps> = ({ eventData, dateStr, timezone, currency, priceInfos, extraLinks, nameSegments, departureSegments, arrivalSegments, startISO, endISO, marker, bodySegments }) => {
    const colors = getTypeColors(eventData.type);
    const IconComponent = getTypeIcon(eventData.type);
    const mainTitle = (() => {
        switch (eventData.baseType) {
            case 'transportation':
            case 'activity':
                return eventData.name;
            case 'stay':
                return eventData.stayName;
            default:
                return '';
        }
    })();

    const displayTitle = (() => {
        if (mainTitle && String(mainTitle).trim() !== '') return String(mainTitle);
        return capitalize(String(eventData.type || ''));
    })();

    const routeOrLocationDisplay = (() => {
        if (eventData.baseType === 'transportation' && eventData.departure && eventData.arrival) {
            const meta = eventData.metadata as Record<string, string>;
            return <Route departure={eventData.departure} arrival={eventData.arrival} departureUrl={meta.departure__url} arrivalUrl={meta.arrival__url} departureSegments={departureSegments} arrivalSegments={arrivalSegments} />;
        }
        if ((eventData.baseType === 'stay' || eventData.baseType === 'activity') && eventData.location) {
            return <Location location={eventData.location} segments={arrivalSegments} />;
        }
        return null;
    })();

    return (
        <div className="my-3 flex items-center">
            {!startISO && !endISO && !marker ? (
                <TimePlaceholder />
            ) : (
                <div className="flex flex-col gap-5 min-w-0 text-right">
                    {startISO || marker ? <TimeDisplay iso={startISO ?? undefined} marker={marker ?? undefined} dateStr={dateStr} timezone={timezone} /> : <TimePlaceholder />}
                    {endISO && <TimeDisplay iso={endISO ?? undefined} dateStr={dateStr} timezone={timezone} />}
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
                    {(() => {
                        const segments =
                            nameSegments ||
                            (() => {
                                const titleText = displayTitle;
                                if (!titleText) return undefined;
                                const meta = eventData.metadata as Record<string, string>;
                                const url = meta.name__url;
                                if (url && isAllowedHref(url)) {
                                    return [{ text: titleText, url }];
                                }
                                return [{ text: titleText }];
                            })();

                        if (segments) {
                            return <SegmentedText segments={segments} className={`font-bold ${colors.text} text-lg`} linkClassName="underline text-inherit" />;
                        }
                        return null;
                    })()}
                    {routeOrLocationDisplay && <div className="text-gray-700 text-sm font-medium">{routeOrLocationDisplay}</div>}
                    {Array.isArray(extraLinks) && extraLinks.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            {extraLinks
                                .filter((l) => l && typeof l.url === 'string' && isAllowedHref(l.url))
                                .map((l, idx) => (
                                    <a key={`${l.label}-${idx}`} href={l.url} target="_blank" rel="noopener noreferrer" className="underline">
                                        {l.label}
                                    </a>
                                ))}
                        </div>
                    )}
                </div>
                {Array.isArray(bodySegments) && bodySegments.length > 0 ? (
                    <div className={`mt-2 pt-2 border-t ${colors.border}`}>
                        {bodySegments.map((seg, idx) => {
                            if (!seg) return null;
                            if ((seg as { kind?: string }).kind === 'inline') {
                                const s = seg as { kind: 'inline'; segments: Array<{ text: string; url?: string }> };
                                if (!Array.isArray(s.segments) || s.segments.length === 0) return null;
                                const key = `inline-${s.segments
                                    .map((x) => `${x.text}-${x.url ?? ''}`)
                                    .join('|')
                                    .slice(0, 64)}-${idx}`;
                                return <SegmentedText key={key} segments={s.segments} className="block text-gray-700 text-sm mb-1" linkClassName="underline text-inherit" />;
                            }
                            if ((seg as { kind?: string }).kind === 'meta') {
                                const m = seg as { kind: 'meta'; entries: Array<{ key: string; segments: Array<{ text: string; url?: string }> }> };
                                const key = `meta-${m.entries
                                    .map((e) => e.key)
                                    .join('|')
                                    .slice(0, 64)}-${idx}`;
                                return <Meta key={key} entries={m.entries} metadata={{}} borderColor={colors.border} currency={currency} priceInfos={priceInfos} />;
                            }
                            if ((seg as { kind?: string }).kind === 'list') {
                                const l = seg as { kind: 'list'; items: Array<Array<{ text: string; url?: string }>>; ordered?: boolean; start?: number | null };
                                if (!Array.isArray(l.items) || l.items.length === 0) return null;
                                const isOrdered = !!l.ordered;
                                const start = typeof l.start === 'number' ? l.start : undefined;
                                if (isOrdered) {
                                    return (
                                        <ol key={`list-${start ?? 'ol'}`} className="ml-6 list-decimal marker:text-blue-600 marker:font-bold marker:text-base" start={start}>
                                            {l.items.map((it) => {
                                                const keyStr = it
                                                    .map((seg) => `${seg.text}-${seg.url ?? ''}`)
                                                    .join('|')
                                                    .slice(0, 64);
                                                return (
                                                    <li key={`li-${keyStr}`}>
                                                        <SegmentedText segments={it} className="text-gray-700 text-sm" linkClassName="underline text-inherit" />
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    );
                                }
                                return (
                                    <ul
                                        key={`list-ul-${l.items.length}-${(l.items[0] || [])
                                            .map((x) => x.text)
                                            .join('-')
                                            .slice(0, 16)}`}
                                        className="ml-6 list-disc marker:text-blue-600 marker:font-bold marker:text-base"
                                    >
                                        {l.items.map((it) => {
                                            const keyStr = it
                                                .map((seg) => `${seg.text}-${seg.url ?? ''}`)
                                                .join('|')
                                                .slice(0, 64);
                                            return (
                                                <li key={`li-${keyStr}`}>
                                                    <SegmentedText segments={it} className="text-gray-700 text-sm" linkClassName="underline text-inherit" />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            }
                            return null;
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
