import type { TimeLike } from '@itinerary-md/core';
import type React from 'react';
import { Location } from './Location';

//

interface RouteProps {
    departure: string;
    arrival: string;
    startTime?: TimeLike;
    endTime?: TimeLike;
    departureUrl?: string;
    arrivalUrl?: string;
}

export const Route: React.FC<RouteProps> = ({ departure, arrival, startTime, endTime, departureUrl, arrivalUrl }) => {
    return (
        <span className="flex items-center gap-2">
            {departureUrl ? (
                <a href={departureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    <Location location={departure} time={startTime} />
                </a>
            ) : (
                <Location location={departure} time={startTime} />
            )}
            <span className="text-gray-400">→</span>
            {arrivalUrl ? (
                <a href={arrivalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    <Location location={arrival} time={endTime} />
                </a>
            ) : (
                <Location location={arrival} time={endTime} />
            )}
        </span>
    );
};
