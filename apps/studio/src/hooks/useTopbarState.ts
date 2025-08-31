import { useCallback, useEffect, useRef, useState } from 'react';
import type { StayMode, TopbarState, ViewMode } from '../types/itinerary';

const CURRENCY_STORAGE_KEY = 'itinerary-md-currency';

/**
 * Topbar状態を管理するHook（初期化と同期を分離）
 * @returns [state, setState] - 状態と更新関数
 */
export function useTopbarState(): [TopbarState, (patch: Partial<TopbarState>) => void] {
    const isInitializedRef = useRef(false);

    const [state, setState] = useState<TopbarState>(() => ({
        baseTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: 'USD',
        viewMode: 'split',
        stayMode: 'default',
    }));

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
                if (storedCurrency) {
                    setState((prevState) => ({ ...prevState, currency: storedCurrency }));
                }
            } catch {}
        }
    }, []);

    useEffect(() => {
        if (isInitializedRef.current) return;

        try {
            const searchParams = new URLSearchParams(window.location.search);
            const patch: Partial<TopbarState> = {};

            const tz = searchParams.get('tz');
            if (tz) patch.baseTz = tz;

            const cur = searchParams.get('cur');
            if (cur) patch.currency = cur;

            const view = searchParams.get('view') as ViewMode | null;
            if (view === 'split' || view === 'editor' || view === 'preview') {
                patch.viewMode = view;
            }

            const stay = searchParams.get('stay') as StayMode | null;
            if (stay === 'default' || stay === 'header') {
                patch.stayMode = stay;
            }

            if (Object.keys(patch).length > 0) {
                setState((prevState) => ({ ...prevState, ...patch }));
            }
        } catch {}

        isInitializedRef.current = true;
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CURRENCY_STORAGE_KEY, state.currency);
            } catch {}
        }
    }, [state.currency]);

    const updateState = useCallback((patch: Partial<TopbarState>) => {
        setState((prevState) => ({ ...prevState, ...patch }));
    }, []);

    useEffect(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('tz', state.baseTz);
            searchParams.set('cur', state.currency);
            searchParams.set('view', state.viewMode);
            searchParams.set('stay', state.stayMode);

            const newSearch = `?${searchParams.toString()}`;
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            history.replaceState(null, '', newUrl);
        } catch {}
    }, [state.baseTz, state.currency, state.viewMode, state.stayMode]);

    return [state, updateState];
}
