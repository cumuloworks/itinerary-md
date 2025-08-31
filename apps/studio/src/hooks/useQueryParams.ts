import type { QueryParams, StayMode, ViewMode } from '../types/itinerary';

/**
 * URLクエリパラメータを解析して型安全な値を返すHook
 * @returns 解析されたクエリパラメータ
 */
export function useQueryParams(): QueryParams {
    try {
        if (typeof window === 'undefined') return {};
        const VIEW_VALUES: readonly ViewMode[] = ['split', 'editor', 'preview'];
        const STAY_VALUES: readonly StayMode[] = ['default', 'header'];

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

        const stay = searchParams.get('stay');
        if (stay && STAY_VALUES.includes(stay as StayMode)) {
            result.stay = stay as StayMode;
        }

        return result;
    } catch {
        return {};
    }
}
