import { useMemo } from 'react';

type ViewMode = 'split' | 'editor' | 'preview';
type StayMode = 'default' | 'header';

export type QueryParams = {
    tz?: string;
    cur?: string;
    view?: ViewMode;
    stay?: StayMode;
};

/**
 * URLクエリパラメータを解析して型安全な値を返すHook
 * @returns 解析されたクエリパラメータ
 */
export function useQueryParams(): QueryParams {
    return useMemo(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const result: QueryParams = {};

            const tz = searchParams.get('tz');
            if (tz) result.tz = tz;

            const cur = searchParams.get('cur');
            if (cur) result.cur = cur;

            const view = searchParams.get('view') as ViewMode | null;
            if (view === 'split' || view === 'editor' || view === 'preview') {
                result.view = view;
            }

            const stay = searchParams.get('stay') as StayMode | null;
            if (stay === 'default' || stay === 'header') {
                result.stay = stay;
            }

            return result;
        } catch {
            return {};
        }
    }, []);
}
