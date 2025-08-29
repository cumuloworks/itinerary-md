import type { TimeLike } from '@itinerary-md/core';
import type React from 'react';
import { Location } from './Location';

//

interface RouteProps {
    departure: string;
    arrival: string;
    startTime?: TimeLike;
    endTime?: TimeLike;
}

export const Route: React.FC<RouteProps> = ({ departure, arrival, startTime, endTime }) => {
    return (
        <span className="flex items-center gap-2">
            <Location location={departure} time={startTime} />
            <span className="text-gray-400">→</span>
            <Location location={arrival} time={endTime} />
        </span>
    );
};
