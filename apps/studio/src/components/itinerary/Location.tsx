import type { TimeLike } from '@itinerary-md/core';
import { MapPin } from 'lucide-react';
import type React from 'react';

export const Location: React.FC<{ location: string; time?: TimeLike }> = ({ location }) => (
    <span className="flex items-center">
        <MapPin size={14} className="mr-1 text-gray-500" />
        <span>{location}</span>
    </span>
);
