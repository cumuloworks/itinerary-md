export type ViewMode = 'split' | 'editor' | 'preview';
export type StayMode = 'default' | 'header';

export type TopbarState = {
    timezone: string;
    currency: string;
    viewMode: ViewMode;
    stayMode: StayMode;
    showPast?: boolean;
    autoScroll?: boolean;
};

export type QueryParams = {
    tz?: string;
    cur?: string;
    view?: ViewMode;
    stay?: StayMode;
    past?: '1' | '0';
    scroll?: '1' | '0';
};

export type ItinerarySummary = {
    startDate?: string;
    endDate?: string;
    numDays?: number;
};

export type CostBreakdownFormatted = {
    transportation: string;
    activity: string;
    stay: string;
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
