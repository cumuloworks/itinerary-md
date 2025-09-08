import { AirlineLogo } from '@/components/itinerary/AirlineLogo';
import { EventBodySegments } from '@/components/itinerary/EventBodySegments';
import { Location } from '@/components/itinerary/Location';
import { Route } from '@/components/itinerary/Route';
import { SegmentedText } from '@/components/itinerary/SegmentedText';
import { TimeDisplay } from '@/components/itinerary/TimeDisplay';
import { isAllowedHref } from '@/utils/url';

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
            | 'cablecar'
            | 'rocket'
            | 'spaceship'
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
        destination?:
            | { kind: 'fromTo'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
            | { kind: 'dashPair'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
            | { kind: 'single'; at: Array<{ text: string; url?: string }> };
        metadata: Record<string, string>;
    };
    dateStr?: string;
    timezone?: string;
    currency?: string;
    priceInfos?: Array<{ key: string; currency: string; amount: number }>;
    priceWarningsByKey?: Record<string, string[]>;
    nameSegments?: Array<{ text: string; url?: string }>;
    startISO?: string | null;
    endISO?: string | null;
    marker?: 'am' | 'pm' | null;
    bodySegments?: Array<
        | { kind: 'inline'; segments: Array<{ text: string; url?: string }> }
        | {
              kind: 'meta';
              entries: Array<{
                  key: string;
                  segments: Array<{ text: string; url?: string }>;
              }>;
          }
        | {
              kind: 'list';
              items: Array<Array<{ text: string; url?: string }>>;
              ordered?: boolean;
              start?: number | null;
          }
    >;
}

function capitalize(s: string): string {
    return s ? s.slice(0, 1).toUpperCase() + s.slice(1) : s;
}

const getTypeColors = (type: EventBlockProps['eventData']['type'], baseType: EventBlockProps['eventData']['baseType']) => {
    const colorHash = new ColorHash({ saturation: 1, lightness: 0.5 });
    const key = String(type || 'activity');
    const [h] = colorHash.hsl(key);

    const PALETTE: Record<
        string,
        {
            text: string;
            border: string;
            cardBg: string;
            iconBg: string;
        }
    > = {
        purple: {
            text: 'text-purple-600',
            border: 'border-purple-600',
            cardBg: 'bg-purple-50',
            iconBg: 'bg-purple-600',
        },
        red: {
            text: 'text-red-600',
            border: 'border-red-600',
            cardBg: 'bg-red-50',
            iconBg: 'bg-red-600',
        },
        orange: {
            text: 'text-orange-600',
            border: 'border-orange-600',
            cardBg: 'bg-orange-50',
            iconBg: 'bg-orange-600',
        },
        amber: {
            text: 'text-amber-600',
            border: 'border-amber-600',
            cardBg: 'bg-amber-50',
            iconBg: 'bg-amber-600',
        },
        yellow: {
            text: 'text-yellow-600',
            border: 'border-yellow-600',
            cardBg: 'bg-yellow-50',
            iconBg: 'bg-yellow-600',
        },
        lime: {
            text: 'text-lime-600',
            border: 'border-lime-600',
            cardBg: 'bg-lime-50',
            iconBg: 'bg-lime-600',
        },
        green: {
            text: 'text-green-600',
            border: 'border-green-600',
            cardBg: 'bg-green-50',
            iconBg: 'bg-green-600',
        },
        emerald: {
            text: 'text-emerald-600',
            border: 'border-emerald-600',
            cardBg: 'bg-emerald-50',
            iconBg: 'bg-emerald-600',
        },
        teal: {
            text: 'text-teal-600',
            border: 'border-teal-600',
            cardBg: 'bg-teal-50',
            iconBg: 'bg-teal-600',
        },
        cyan: {
            text: 'text-cyan-600',
            border: 'border-cyan-600',
            cardBg: 'bg-cyan-50',
            iconBg: 'bg-cyan-600',
        },
        blue: {
            text: 'text-blue-600',
            border: 'border-blue-600',
            cardBg: 'bg-blue-50',
            iconBg: 'bg-blue-600',
        },
        pink: {
            text: 'text-pink-600',
            border: 'border-pink-600',
            cardBg: 'bg-pink-50',
            iconBg: 'bg-pink-600',
        },
        gray: {
            text: 'text-gray-600',
            border: 'border-gray-600',
            cardBg: 'bg-gray-50',
            iconBg: 'bg-gray-600',
        },
    };

    const families = (() => {
        switch (baseType) {
            case 'stay':
                // Single color (purple family)
                return ['purple'];
            case 'transportation':
                // Prefer red-to-yellow spectrum
                return ['red', 'orange', 'amber', 'yellow'];
            default:
                // The rest are activity-like (yellow-green to blue). Exclude sky, include emerald
                return ['amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'blue', 'pink', 'gray'];
        }
    })();

    const idx = families.length > 0 ? Math.floor(((h % 360) / 360) * families.length) % families.length : 0;
    const fam = families[idx] || 'blue';

    return PALETTE[fam] || PALETTE.blue;
};

import ColorHash from 'color-hash';
//
import { EventActionsMenu } from '@/components/itinerary/EventActionsMenu';
import { getIconForEventType } from '@/components/itinerary/iconMaps';
import { TimePlaceholder } from '@/components/itinerary/TimePlaceholder';

const getTypeIcon = (type: EventBlockProps['eventData']['type']) => getIconForEventType(type);

export const EventBlock: React.FC<EventBlockProps> = ({ eventData, dateStr, timezone, currency, priceWarningsByKey, priceInfos, nameSegments, startISO, endISO, marker, bodySegments }) => {
    const colors = getTypeColors(eventData.type, eventData.baseType);
    const IconComponent = getTypeIcon(eventData.type);
    const mainTitle = eventData.name;

    const displayTitle = (() => {
        if (mainTitle && String(mainTitle).trim() !== '') return String(mainTitle);
        return capitalize(String(eventData.type || ''));
    })();

    const routeOrLocationDisplay = (() => {
        const dest = eventData.destination as
            | { kind: 'fromTo'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
            | { kind: 'dashPair'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
            | { kind: 'single'; at: Array<{ text: string; url?: string }> }
            | undefined;
        if (!dest) return null;
        if (dest.kind === 'fromTo' || dest.kind === 'dashPair') {
            const hasFrom = Array.isArray(dest.from) && dest.from.length > 0;
            const hasTo = Array.isArray(dest.to) && dest.to.length > 0;
            if (hasFrom && hasTo) return <Route departureSegments={dest.from} arrivalSegments={dest.to} />;
            const single = hasFrom ? dest.from : hasTo ? dest.to : [];
            return single.length > 0 ? <Location location={undefined as unknown as string} segments={single} /> : null;
        }
        if (dest.kind === 'single') {
            return Array.isArray(dest.at) && dest.at.length > 0 ? <Location location={undefined as unknown as string} segments={dest.at} /> : null;
        }
        return null;
    })();

    const titleSegments = (() => {
        if (Array.isArray(nameSegments) && nameSegments.length > 0) return nameSegments;
        const titleText = displayTitle;
        if (!titleText) return undefined;
        const meta = eventData.metadata as Record<string, string>;
        const url = meta.name__url;
        return url && isAllowedHref(url) ? [{ text: titleText, url }] : [{ text: titleText }];
    })();

    // Build external calendar URLs
    const titleTextForCalendar = (() => {
        const titleText = mainTitle && String(mainTitle).trim() !== '' ? String(mainTitle) : capitalize(String(eventData.type || ''));
        return titleText || 'Event';
    })();
    // start/end are computed in EventActionsMenu
    // All action menu logic moved to EventActionsMenu

    return (
        <div className="my-3 flex items-center break-inside-avoid relative group/event">
            {!startISO && !endISO && !marker ? (
                <TimePlaceholder />
            ) : (
                <div className="flex flex-col gap-5 min-w-0 text-right">
                    {startISO || marker ? <TimeDisplay iso={startISO ?? undefined} marker={marker ?? undefined} dateStr={dateStr} timezone={timezone} /> : <TimePlaceholder />}
                    {endISO && <TimeDisplay iso={endISO ?? undefined} dateStr={dateStr} timezone={timezone} />}
                </div>
            )}

            <EventActionsMenu iconBgClass={colors.iconBg} IconComponent={IconComponent} title={titleTextForCalendar} destination={eventData.destination as any} startISO={startISO} endISO={endISO} timezone={timezone} />

            <div className={`flex-1 min-w-0 p-5 -ml-4.5 pl-8 ${colors.cardBg} border-l-4 ${colors.border}`}>
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                    {eventData.type === 'flight' && 'name' in eventData && eventData.name && <AirlineLogo flightCode={eventData.name} size={24} />}
                    {titleSegments ? <SegmentedText segments={titleSegments} className={`font-bold ${colors.text} text-lg`} linkClassName="underline text-inherit" /> : null}
                    {routeOrLocationDisplay && <div className="text-gray-700 text-sm font-medium">{routeOrLocationDisplay}</div>}
                </div>
                <EventBodySegments bodySegments={bodySegments} borderClass={colors.border} priceWarningsByKey={priceWarningsByKey} priceInfos={priceInfos} toCurrency={currency} />
            </div>
        </div>
    );
};
