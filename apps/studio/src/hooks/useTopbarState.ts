import { isValidIanaTimeZone } from '@itinerary-md/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyError } from '../core/errors';
import type { TopbarState, ViewMode } from '../types/itinerary';

const CURRENCY_STORAGE_KEY = 'itinerary-md-currency';

const VIEW_VALUES: readonly ViewMode[] = ['split', 'editor', 'preview'];

/**
 * Topbar状態を管理するHook（初期化と同期を分離）
 * @returns [state, setState] - 状態と更新関数
 */
export function useTopbarState(): [TopbarState, (patch: Partial<TopbarState>) => void] {
    const isInitializedRef = useRef(false);

    const [state, setState] = useState<TopbarState>(() => ({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: 'USD',
        viewMode: 'split',
        showPast: true,
        autoScroll: true,
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
            if (tz) {
                if (isValidIanaTimeZone(tz)) {
                    patch.timezone = tz;
                } else {
                    notifyError(`URL timezone "${tz}" is invalid. Using current selection.`);
                }
            }

            const cur = searchParams.get('cur');
            if (cur) patch.currency = cur;

            const view = searchParams.get('view');
            if (view && VIEW_VALUES.includes(view as ViewMode)) {
                patch.viewMode = view as ViewMode;
            }

            const past = searchParams.get('past');
            if (past) patch.showPast = past === '1';

            const scroll = searchParams.get('scroll');
            if (scroll) patch.autoScroll = scroll === '1';

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
            const curr = new URLSearchParams(window.location.search);
            if (
                curr.get('tz') === state.timezone &&
                curr.get('cur') === state.currency &&
                curr.get('view') === state.viewMode &&
                curr.get('past') === (state.showPast ? '1' : '0') &&
                curr.get('scroll') === (state.autoScroll ? '1' : '0')
            )
                return;

            const searchParams = new URLSearchParams(window.location.search);
            if (isValidIanaTimeZone(state.timezone)) {
                searchParams.set('tz', state.timezone);
            }
            searchParams.set('cur', state.currency);
            searchParams.set('view', state.viewMode);
            searchParams.set('past', state.showPast ? '1' : '0');
            searchParams.set('scroll', state.autoScroll ? '1' : '0');

            const newSearch = `?${searchParams.toString()}`;
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            history.replaceState(null, '', newUrl);
        } catch {}
    }, [state.timezone, state.currency, state.viewMode, state.showPast, state.autoScroll]);

    return [state, updateState];
}
