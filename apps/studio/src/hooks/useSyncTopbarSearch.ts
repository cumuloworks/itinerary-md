import { useEffect } from 'react';

type ViewMode = 'split' | 'editor' | 'preview';
type StayMode = 'default' | 'header';

export type TopbarState = {
    baseTz: string;
    currency: string;
    dashboardVisible: boolean;
    viewMode: ViewMode;
    stayMode: StayMode;
};

export function useSyncTopbarSearch(state: TopbarState) {
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            sp.set('tz', state.baseTz);
            sp.set('cur', state.currency);
            sp.set('view', state.viewMode);
            sp.set('dash', state.dashboardVisible ? '1' : '0');
            sp.set('stay', state.stayMode);
            const newSearch = `?${sp.toString()}`;
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            history.replaceState(null, '', newUrl);
        } catch {}
    }, [state.baseTz, state.currency, state.viewMode, state.dashboardVisible, state.stayMode]);
}
