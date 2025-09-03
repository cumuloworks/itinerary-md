import { isValidIanaTimeZone } from '../../time/iana';
import type { TimeRangeLike } from './time';
import { parseTimeRangeTokens, resolveTimeRange } from './time';

export interface BaseEventData {
    timeRange?: TimeRangeLike;
    metadata: Record<string, string>;
}

export interface TransportationEventData extends BaseEventData {
    type: 'flight' | 'train' | 'drive' | 'ferry' | 'bus' | 'taxi' | 'subway';
    baseType: 'transportation';
    name: string;
    departure: string;
    arrival: string;
}

export interface StayEventData extends BaseEventData {
    type: 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan';
    baseType: 'stay';
    stayName: string;
    location: string;
}

export interface ActivityEventData extends BaseEventData {
    type: 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe';
    baseType: 'activity';
    name: string;
    location?: string;
}

export type EventData = TransportationEventData | StayEventData | ActivityEventData;

export const parseTimeAndType = (
    text: string,
    timezone?: string,
    baseDate?: string
): {
    timeRange?: TimeRangeLike;
    type: string;
    eventDescription: string;
} | null => {
    const unified = text.match(/^(\[(?:[\d:+@A-Za-z_/-]+|)\](?:\s*-\s*\[(?:[\d:+@A-Za-z_/-]+|)\])?)\s+(\w+)\s*(.*)/);
    if (!unified) return null;
    const defaultTimezone = isValidIanaTimeZone(timezone) ? timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [, timeRangeText, type, eventDescription] = unified;
    const tokens = parseTimeRangeTokens(timeRangeText);
    const timeRange = tokens ? resolveTimeRange(tokens, defaultTimezone, baseDate) : undefined;

    return { timeRange, type, eventDescription };
};

export const parseRoute = (route: string): { departure: string; arrival: string } | null => {
    if (!route) return null;
    const parts = route
        .split(' - ')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (parts.length >= 2) {
        return { departure: parts[0], arrival: parts[parts.length - 1] };
    }
    return null;
};

const parseTransportationData = (eventDescription: string, baseData: BaseEventData, type: 'flight' | 'train' | 'drive' | 'ferry' | 'bus' | 'taxi' | 'subway'): TransportationEventData | null => {
    const [name, routeText] = eventDescription.split('::').map((s) => s.trim());
    if (!name) return null;
    const routeInfo = routeText ? parseRoute(routeText) : null;
    return {
        ...baseData,
        type,
        baseType: 'transportation',
        name,
        departure: routeInfo?.departure ?? '',
        arrival: routeInfo?.arrival ?? '',
    };
};

const parseStayData = (eventDescription: string, baseData: BaseEventData, type: 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan', originalType?: string): StayEventData => {
    let stayName = eventDescription;
    let location: string | undefined = '';

    if (eventDescription.includes('::')) {
        const [left, right] = eventDescription.split('::').map((s) => s.trim());
        location = right || '';

        const isStayAlias = ['hotel', 'hostel', 'ryokan', 'dormitory'].includes(type);
        if (!left || (originalType && left.toLowerCase() === originalType.toLowerCase() && isStayAlias)) {
            stayName = originalType ? originalType.charAt(0).toUpperCase() + originalType.slice(1) : left;
        } else {
            stayName = left;
        }
    } else {
        const atMatch = eventDescription.match(/^(.+?)\s+at\s+(.+)$/);
        const atOnlyMatch = eventDescription.match(/^at\s+(.+)$/);

        if (atMatch) {
            const [, left, right] = atMatch;
            const leftTrimmed = left.trim();
            const rightTrimmed = right.trim();
            location = rightTrimmed || '';

            const isStayAlias = ['hotel', 'hostel', 'ryokan', 'dormitory'].includes(type);
            if (!leftTrimmed || (originalType && leftTrimmed.toLowerCase() === originalType.toLowerCase() && isStayAlias)) {
                stayName = originalType ? originalType.charAt(0).toUpperCase() + originalType.slice(1) : leftTrimmed;
            } else {
                stayName = leftTrimmed;
            }
        } else if (atOnlyMatch) {
            const rightTrimmed = atOnlyMatch[1].trim();
            location = rightTrimmed || '';

            const isStayAlias = ['hotel', 'hostel', 'ryokan', 'dormitory'].includes(type);
            if (originalType && isStayAlias) {
                stayName = originalType.charAt(0).toUpperCase() + originalType.slice(1);
            } else {
                stayName = '';
            }
        }
    }

    return {
        ...baseData,
        type,
        baseType: 'stay',
        stayName,
        location,
    };
};

const parseActivityData = (
    eventDescription: string,
    baseData: BaseEventData,
    type: 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe',
    originalType?: string
): ActivityEventData => {
    let name = eventDescription;
    let location: string | undefined = '';

    if (eventDescription.includes('::')) {
        const [left, right] = eventDescription.split('::').map((s) => s.trim());
        location = right || '';

        const isMealAlias = ['lunch', 'dinner', 'breakfast', 'brunch'].includes(type);
        const isActivityAlias = ['museum', 'sightseeing', 'shopping', 'spa', 'park', 'cafe'].includes(type);
        if (!left || (originalType && left.toLowerCase() === originalType.toLowerCase() && (isMealAlias || isActivityAlias))) {
            name = originalType ? originalType.charAt(0).toUpperCase() + originalType.slice(1) : left;
        } else {
            name = left;
        }
    } else {
        const atMatch = eventDescription.match(/^(.+?)\s+at\s+(.+)$/);
        const atOnlyMatch = eventDescription.match(/^at\s+(.+)$/);

        if (atMatch) {
            const [, left, right] = atMatch;
            const leftTrimmed = left.trim();
            const rightTrimmed = right.trim();
            location = rightTrimmed || '';

            const isMealAlias = ['lunch', 'dinner', 'breakfast', 'brunch'].includes(type);
            const isActivityAlias = ['museum', 'sightseeing', 'shopping', 'spa', 'park', 'cafe'].includes(type);
            if (!leftTrimmed || (originalType && leftTrimmed.toLowerCase() === originalType.toLowerCase() && (isMealAlias || isActivityAlias))) {
                name = originalType ? originalType.charAt(0).toUpperCase() + originalType.slice(1) : leftTrimmed;
            } else {
                name = leftTrimmed;
            }
        } else if (atOnlyMatch) {
            const rightTrimmed = atOnlyMatch[1].trim();
            location = rightTrimmed || '';

            const isMealAlias = ['lunch', 'dinner', 'breakfast', 'brunch'].includes(type);
            const isActivityAlias = ['museum', 'sightseeing', 'shopping', 'spa', 'park', 'cafe'].includes(type);
            if (originalType && (isMealAlias || isActivityAlias)) {
                name = originalType.charAt(0).toUpperCase() + originalType.slice(1);
            } else {
                name = '';
            }
        }
    }

    return {
        ...baseData,
        type,
        baseType: 'activity',
        name,
        location,
    };
};

const createEventBase = (timeRange?: TimeRangeLike): BaseEventData => ({
    timeRange,
    metadata: {},
});

export const parseEvent = (text: string, context?: EventData, timezone?: string, baseDate?: string): EventData | null => {
    const parsed = parseTimeAndType(text, timezone, baseDate);
    if (!parsed) return null;
    const { type, eventDescription, timeRange } = parsed;
    const baseData = createEventBase(timeRange);
    switch (type) {
        case 'flight':
        case 'train':
        case 'drive':
        case 'ferry':
        case 'bus':
        case 'taxi':
        case 'subway': {
            const parsed = parseTransportationData(eventDescription, baseData, type);
            if (parsed) return parsed;
            if (context && context.type === type && 'name' in context && 'departure' in context && 'arrival' in context) {
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type,
                    baseType: 'transportation',
                    metadata: context.metadata,
                    name: context.name,
                    departure: context.departure,
                    arrival: context.arrival,
                };
            }
            return null;
        }
        case 'stay':
        case 'dormitory':
        case 'hotel':
        case 'hostel':
        case 'ryokan': {
            const parsed = parseStayData(eventDescription, baseData, type as 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan', type);
            if (parsed) return parsed;
            if (context && (context.type === type || context.type === 'stay' || context.type === 'dormitory' || context.type === 'hotel' || context.type === 'hostel' || context.type === 'ryokan')) {
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: type as 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan',
                    baseType: 'stay',
                    metadata: context.metadata,
                    stayName: context.stayName,
                    location: context.location,
                };
            }
            return null;
        }
        case 'meal':
        case 'lunch':
        case 'dinner':
        case 'breakfast':
        case 'brunch':
        case 'activity':
        case 'museum':
        case 'sightseeing':
        case 'shopping':
        case 'spa':
        case 'park':
        case 'cafe': {
            const parsed = parseActivityData(eventDescription, baseData, type as 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe', type);
            if (parsed) return parsed;
            if (context && context.type === type && 'name' in context) {
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: type as 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe',
                    baseType: 'activity',
                    metadata: context.metadata,
                    name: context.name,
                    location: context.location,
                };
            }
            return null;
        }
        default:
            return null;
    }
};
