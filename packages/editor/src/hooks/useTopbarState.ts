import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyError } from '@/core/errors';
import { tInstant } from '@/i18n';
import type { TopbarState, ViewMode } from '@/types/itinerary';
import { isValidIanaTimeZone } from '@/utils/timezone';

const CURRENCY_STORAGE_KEY = 'itinerary-md-currency';

const VIEW_VALUES: readonly ViewMode[] = ['split', 'editor', 'preview'];

/**
 * Hook to manage Topbar state (initialization and sync are separated).
 * @returns [state, setState] - State and update function.
 */
export function useTopbarState(): [TopbarState, (patch: Partial<TopbarState>) => void] {
    const isInitializedRef = useRef(false);

    const [state, setState] = useState<TopbarState>(() => ({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: 'USD',
        viewMode: 'split',
        showPast: true,
        autoScroll: true,
        showMdast: false,
        altNames: false,
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
                    notifyError(tInstant('toast.url.tz.invalid', { tz }));
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

            const alt = searchParams.get('alt');
            if (alt) patch.altNames = alt === '1';

            // mdast flag is ephemeral and should not be driven by URL

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
        // Skip URL sync until initial state has been read from URL/localStorage
        if (!isInitializedRef.current) return;
        try {
            const curr = new URLSearchParams(window.location.search);
            const next = new URLSearchParams(curr);

            // timezone
            if (isValidIanaTimeZone(state.timezone)) {
                next.set('tz', state.timezone);
            }

            // always reflect these
            next.set('cur', state.currency);
            next.set('view', state.viewMode);
            next.set('past', state.showPast ? '1' : '0');
            next.set('scroll', state.autoScroll ? '1' : '0');

            // alt is explicitly represented as 0/1 for consistency
            next.set('alt', state.altNames ? '1' : '0');

            // If no change, skip updating history
            if (curr.toString() === next.toString()) return;

            const newSearch = `?${next.toString()}`;
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            history.replaceState(null, '', newUrl);
        } catch {}
    }, [state.timezone, state.currency, state.viewMode, state.showPast, state.autoScroll, state.altNames]);

    return [state, updateState];
}
