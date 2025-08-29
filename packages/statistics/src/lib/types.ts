export type Summary = {
    startDate?: string;
    endDate?: string;
    numDays?: number;
};

export type TotalsBreakdown = {
    total: number;
    transport: number;
    activity: number;
    meal: number;
};

export type AnalyzeOptions = {
    baseCurrency: string;
    ratesUSDBase: Record<string, number>;
};

export type AnalyzeResult = {
    summary: Summary;
    totals: TotalsBreakdown;
};
