export type ViewMode = 'split' | 'editor' | 'preview';
export type StayMode = 'default' | 'header';

export type TopbarState = {
    timezone: string;
    currency: string;
    viewMode: ViewMode;
    stayMode: StayMode;
};

export type QueryParams = {
    tz?: string;
    cur?: string;
    view?: ViewMode;
    stay?: StayMode;
};

export type ItinerarySummary = {
    startDate?: string;
    endDate?: string;
    numDays?: number;
};

export type CostBreakdownFormatted = {
    transport: string;
    activity: string;
    meal: string;
};

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
