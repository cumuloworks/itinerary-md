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

export const parseMetadata = (meta: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const regex = /(\w+):\s*([^,]+?)(?=\s*,\s*\w+:|$)/g;
    let match: RegExpExecArray | null = regex.exec(meta);
    while (match !== null) {
        const key = match[1]?.trim();
        const value = match[2]?.trim().replace(/['"]/g, '');
        if (key && value) {
            result[key] = value;
        }
        match = regex.exec(meta);
    }
    return result;
};

export const extractMetadata = (text: string): { metadata: Record<string, string>; mainText: string } => {
    let mainText = text.replace(/\s*\{[^}]*\}/, '');
    mainText = mainText.replace(/\s*\{[^}]*$/, '');
    mainText = mainText.replace(/\s*\}\s*$/, '');
    return { metadata: {}, mainText: mainText.trim() };
};

export const parseTimeAndType = (
    text: string,
    baseTz?: string,
    baseDate?: string
): {
    timeRange?: TimeRangeLike;
    type: string;
    rest: string;
} | null => {
    const unified = text.match(/^(\[(?:[\d:+@A-Za-z_/-]+|)\](?:\s*-\s*\[(?:[\d:+@A-Za-z_/-]+|)\])?)\s+(\w+)\s*(.*)/);
    if (!unified) return null;
    const defaultBaseTz = baseTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [, timeRangeText, type, rest] = unified;
    const tokens = parseTimeRangeTokens(timeRangeText);
    const timeRange = tokens ? resolveTimeRange(tokens, defaultBaseTz, baseDate) : undefined;

    return { timeRange, type, rest };
};

export const extractAirlineCode = (flightCode: string): string | undefined => {
    if (!flightCode) return undefined;
    const match = flightCode.match(/^([A-Z]{2})/);
    return match ? match[1] : undefined;
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

const parseTransportationData = (rest: string, baseData: BaseEventData, type: 'flight' | 'train' | 'drive' | 'ferry' | 'bus' | 'taxi' | 'subway'): TransportationEventData | null => {
    const { mainText } = extractMetadata(rest);
    const [left, right] = mainText.split('::').map((s) => s.trim());
    const name = left || '';
    const routeText = right || '';
    if (!name) return null;
    const routeInfo = routeText ? parseRoute(routeText) : null;
    return {
        ...baseData,
        type,
        baseType: 'transportation',
        metadata: { ...baseData.metadata },
        name,
        departure: routeInfo?.departure ?? '',
        arrival: routeInfo?.arrival ?? '',
    };
};

const parseStayData = (rest: string, baseData: BaseEventData, type: 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan'): StayEventData => {
    const { mainText } = extractMetadata(rest);
    const [left, right] = mainText.split('::').map((s) => s.trim());
    const stayName = left || '';
    const location = right || '';
    return {
        ...baseData,
        type,
        baseType: 'stay',
        metadata: { ...baseData.metadata },
        stayName,
        location,
    };
};

const parseActivityData = (
    rest: string,
    baseData: BaseEventData,
    type: 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe',
    originalType?: string
): ActivityEventData => {
    const { mainText } = extractMetadata(rest);
    let name = mainText;
    let location: string | undefined = '';

    if (mainText.includes('::')) {
        const [left, right] = mainText.split('::').map((s) => s.trim());
        location = right || '';

        const isMealAlias = ['lunch', 'dinner', 'breakfast', 'brunch'].includes(type);
        const isActivityAlias = ['museum', 'sightseeing', 'shopping', 'spa', 'park', 'cafe'].includes(type);
        if (!left || (originalType && left.toLowerCase() === originalType.toLowerCase() && (isMealAlias || isActivityAlias))) {
            name = originalType ? originalType.charAt(0).toUpperCase() + originalType.slice(1) : left;
        } else {
            name = left;
        }
    } else {
        const atMatch = mainText.match(/^(.+?)\s+at\s+(.+)$/);
        if (atMatch) {
            const [, activityName, place] = atMatch;
            name = activityName;
            location = place;
        } else {
            const atOnlyMatch = mainText.match(/^at\s+(.+)$/);
            const isMealAlias = ['lunch', 'dinner', 'breakfast', 'brunch'].includes(type);
            const isActivityAlias = ['museum', 'sightseeing', 'shopping', 'spa', 'park', 'cafe'].includes(type);
            if (atOnlyMatch && originalType && (isMealAlias || isActivityAlias)) {
                name = originalType.charAt(0).toUpperCase() + originalType.slice(1);
                location = atOnlyMatch[1];
            }
        }
    }

    return {
        ...baseData,
        type,
        baseType: 'activity',
        metadata: { ...baseData.metadata },
        name,
        location,
    };
};

export const parseEvent = (text: string, context?: EventData, baseTz?: string, baseDate?: string): EventData | null => {
    const parsed = parseTimeAndType(text, baseTz, baseDate);
    if (!parsed) return null;
    const { type, rest, timeRange } = parsed;
    const baseData: BaseEventData = { timeRange, metadata: {} };
    switch (type) {
        case 'flight':
        case 'train':
        case 'drive':
        case 'ferry':
        case 'bus':
        case 'taxi':
        case 'subway': {
            const parsed = parseTransportationData(rest, baseData, type);
            if (parsed) return parsed;
            if (context && context.type === type && 'name' in context && 'departure' in context && 'arrival' in context) {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type,
                    baseType: 'transportation',
                    metadata: { ...context.metadata, ...metadata },
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
            const parsed = parseStayData(rest, baseData, type as 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan');
            if (parsed) return parsed;
            if (context && (context.type === type || context.type === 'stay' || context.type === 'dormitory' || context.type === 'hotel' || context.type === 'hostel' || context.type === 'ryokan')) {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: type as 'stay' | 'dormitory' | 'hotel' | 'hostel' | 'ryokan',
                    baseType: 'stay',
                    metadata: { ...context.metadata, ...metadata },
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
            const parsed = parseActivityData(rest, baseData, type as 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe', type);
            if (parsed) return parsed;
            if (context && context.type === type && 'name' in context) {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: type as 'meal' | 'lunch' | 'dinner' | 'breakfast' | 'brunch' | 'activity' | 'museum' | 'sightseeing' | 'shopping' | 'spa' | 'park' | 'cafe',
                    baseType: 'activity',
                    metadata: { ...context.metadata, ...metadata },
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
