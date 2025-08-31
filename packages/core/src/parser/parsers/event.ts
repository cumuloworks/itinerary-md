import type { TimeRangeLike } from './time';
import { parseTimeRangeTokens, resolveTimeRange } from './time';

export interface BaseEventData {
    type: 'flight' | 'train' | 'stay' | 'meal' | 'activity';
    timeRange?: TimeRangeLike;
    metadata: Record<string, string>;
}

export interface FlightEventData extends BaseEventData {
    type: 'flight';
    flightCode: string;
    departure: string;
    arrival: string;
}

export interface TrainEventData extends BaseEventData {
    type: 'train';
    trainName: string;
    departure: string;
    arrival: string;
}

export interface StayEventData extends BaseEventData {
    type: 'stay';
    stayName: string;
    location: string;
}

export interface MealEventData extends BaseEventData {
    type: 'meal';
    restaurantName: string;
    location?: string;
}

export interface ActivityEventData extends BaseEventData {
    type: 'activity';
    activityName: string;
    location?: string;
}

export type EventData = FlightEventData | TrainEventData | StayEventData | MealEventData | ActivityEventData;

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

const parseFlightData = (rest: string, baseData: Omit<BaseEventData, 'type'>): FlightEventData | null => {
    const { mainText } = extractMetadata(rest);
    const [left, right] = mainText.split('::').map((s) => s.trim());
    const flightCode = left || '';
    const routeText = right || '';
    if (!flightCode) return null;
    const routeInfo = routeText ? parseRoute(routeText) : null;
    return {
        ...baseData,
        type: 'flight',
        metadata: { ...baseData.metadata },
        flightCode,
        departure: routeInfo?.departure ?? '',
        arrival: routeInfo?.arrival ?? '',
    };
};

const parseTrainData = (rest: string, baseData: Omit<BaseEventData, 'type'>): TrainEventData | null => {
    const { mainText } = extractMetadata(rest);
    const [left, right] = mainText.split('::').map((s) => s.trim());
    const trainName = left || '';
    const routeText = right || '';
    if (!trainName) return null;
    const routeInfo = routeText ? parseRoute(routeText) : null;
    return {
        ...baseData,
        type: 'train',
        metadata: { ...baseData.metadata },
        trainName,
        departure: routeInfo?.departure ?? '',
        arrival: routeInfo?.arrival ?? '',
    };
};

const parseStayData = (rest: string, baseData: Omit<BaseEventData, 'type'>): StayEventData => {
    const { mainText } = extractMetadata(rest);
    const [left, right] = mainText.split('::').map((s) => s.trim());
    const stayName = left || '';
    const location = right || '';
    return {
        ...baseData,
        type: 'stay',
        metadata: { ...baseData.metadata },
        stayName,
        location,
    };
};

const parseMealData = (rest: string, baseData: Omit<BaseEventData, 'type'>): MealEventData => {
    const { mainText } = extractMetadata(rest);
    let restaurantName = mainText;
    let location = '';

    // If :: separator exists, use it and ignore "at" pattern
    if (mainText.includes('::')) {
        const [left, right] = mainText.split('::').map((s) => s.trim());
        restaurantName = left || '';
        location = right || '';
    } else {
        // Only try "at" pattern if no :: separator
        const atMatch = mainText.match(/^(.+?)\s+at\s+(.+)$/);
        if (atMatch) {
            const [, name, place] = atMatch;
            restaurantName = name;
            location = place;
        }
    }

    return {
        ...baseData,
        type: 'meal',
        metadata: { ...baseData.metadata },
        restaurantName,
        location,
    };
};

const parseActivityData = (rest: string, baseData: Omit<BaseEventData, 'type'>): ActivityEventData => {
    const { mainText } = extractMetadata(rest);
    let activityName = mainText;
    let location: string | undefined;
    const atMatch = mainText.match(/^(.+?)\s+at\s+(.+)$/);
    if (atMatch) {
        const [, activity, place] = atMatch;
        activityName = activity;
        location = place;
    }
    return {
        ...baseData,
        type: 'activity',
        metadata: { ...baseData.metadata },
        activityName,
        location,
    };
};

export const parseEvent = (text: string, context?: EventData, baseTz?: string, baseDate?: string): EventData | null => {
    const parsed = parseTimeAndType(text, baseTz, baseDate);
    if (!parsed) return null;
    const { type, rest, timeRange } = parsed;
    const baseData: Omit<BaseEventData, 'type'> = { timeRange, metadata: {} };
    switch (type) {
        case 'flight': {
            const parsedFlight = parseFlightData(rest, baseData);
            if (parsedFlight) return parsedFlight;
            if (context && context.type === 'flight') {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: 'flight',
                    metadata: { ...context.metadata, ...metadata },
                    flightCode: context.flightCode,
                    departure: context.departure,
                    arrival: context.arrival,
                };
            }
            return null;
        }
        case 'train': {
            const parsedTrain = parseTrainData(rest, baseData);
            if (parsedTrain) return parsedTrain;
            if (context && context.type === 'train') {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: 'train',
                    metadata: { ...context.metadata, ...metadata },
                    trainName: context.trainName,
                    departure: context.departure,
                    arrival: context.arrival,
                };
            }
            return null;
        }
        case 'stay': {
            const parsedStay = parseStayData(rest, baseData);
            if (parsedStay) return parsedStay;
            if (context && context.type === 'stay') {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: 'stay',
                    metadata: { ...context.metadata, ...metadata },
                    stayName: context.stayName,
                    location: context.location,
                };
            }
            return null;
        }
        case 'meal': {
            const parsedMeal = parseMealData(rest, baseData);
            if (parsedMeal) return parsedMeal;
            if (context && context.type === 'meal') {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: 'meal',
                    metadata: { ...context.metadata, ...metadata },
                    restaurantName: context.restaurantName,
                    location: context.location,
                };
            }
            return null;
        }
        case 'activity': {
            const parsedActivity = parseActivityData(rest, baseData);
            if (parsedActivity) return parsedActivity;
            if (context && context.type === 'activity') {
                const { metadata } = extractMetadata(rest);
                return {
                    ...baseData,
                    timeRange: baseData.timeRange || context.timeRange,
                    type: 'activity',
                    metadata: { ...context.metadata, ...metadata },
                    activityName: context.activityName,
                    location: context.location,
                };
            }
            return null;
        }
        default:
            return null;
    }
};
