import type { QueryParams, ViewMode } from '../types/itinerary';

/**
 * Hook that parses URL query parameters and returns type-safe values.
 * @returns Parsed query parameters.
 */
export function useQueryParams(): QueryParams {
    try {
        if (typeof window === 'undefined') return {};
        const VIEW_VALUES: readonly ViewMode[] = ['split', 'editor', 'preview'];

        const searchParams = new URLSearchParams(window.location.search);
        const result: QueryParams = {};

        const tz = searchParams.get('tz');
        if (tz) result.tz = tz;

        const cur = searchParams.get('cur')?.toUpperCase() ?? null;
        if (cur && /^[A-Z]{3}$/.test(cur)) result.cur = cur;

        const view = searchParams.get('view');
        if (view && VIEW_VALUES.includes(view as ViewMode)) {
            result.view = view as ViewMode;
        }

        return result;
    } catch {
        return {};
    }
}
