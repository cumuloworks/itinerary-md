import type { TextSegment } from '@itinerary-md/core';
import type React from 'react';
import { Location } from './Location';
// isAllowedHref は不要（セグメントはremarkプラグインで処理済み）

//

interface RouteProps {
    departureSegments?: TextSegment[];
    arrivalSegments?: TextSegment[];
}

export const Route: React.FC<RouteProps> = ({ 
    departureSegments,
    arrivalSegments 
}) => {
    // セグメントはremarkプラグインで作成されるため、fallbackロジックを削除
    const depSegments = departureSegments || [];
    const arrSegments = arrivalSegments || [];
    
    return (
        <span className="flex items-center gap-2">
            <Location 
                segments={depSegments}
            />
            <span className="text-gray-400">→</span>
            <Location 
                segments={arrSegments}
            />
        </span>
    );
};
