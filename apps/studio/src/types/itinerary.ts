// Base types
export type ViewMode = 'split' | 'editor' | 'preview';
export type StayMode = 'default' | 'header';

// Topbar state management
export type TopbarState = {
    timezone: string;
    currency: string;
    viewMode: ViewMode;
    stayMode: StayMode;
};

// Query parameters for URL serialization
export type QueryParams = {
    tz?: string;
    cur?: string;
    view?: ViewMode;
    stay?: StayMode;
};

// Itinerary summary data
export type ItinerarySummary = {
    startDate?: string;
    endDate?: string;
    numDays?: number;
};

// Cost breakdown formatted for display
export type CostBreakdownFormatted = {
    transport: string;
    activity: string;
    meal: string;
};

// Hook option types
export type UseAutosaveOptions = {
    key: string;
    delay: number;
    onSuccess?: () => void;
    onError?: () => void;
};

export type UseInitialContentOptions = {
    storageKey: string;
    samplePath: string;
};
