import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyError } from '@/core/errors';
import { tInstant } from '@/i18n';
import type { TopbarState, ViewMode } from '@/types/itinerary';
import { prefKeys, readBoolean, writeBoolean } from '@/utils/prefs';
import { isValidIanaTimeZone } from '@/utils/timezone';

// currency is managed only via URL query; no localStorage key

const VIEW_VALUES: readonly ViewMode[] = ['split', 'editor', 'preview'];

// Default values for flags that are persisted in local storage
const DEFAULTS = {
    showPast: true,
    autoScroll: true,
    altNames: false,
} as const;

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
        if (typeof window === 'undefined') return;
        // Load persisted values for non-URL flags from localStorage
        const storedPast = readBoolean(prefKeys.showPast, DEFAULTS.showPast);
        const storedScroll = readBoolean(prefKeys.autoScroll, DEFAULTS.autoScroll);
        const storedAlt = readBoolean(prefKeys.altNames, DEFAULTS.altNames);
        setState((prev) => ({
            ...prev,
            showPast: storedPast,
            autoScroll: storedScroll,
            altNames: storedAlt,
        }));
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

            // past/scroll/alt should not be driven by URL anymore

            // mdast flag is ephemeral and should not be driven by URL

            if (Object.keys(patch).length > 0) {
                setState((prevState) => ({ ...prevState, ...patch }));
            }
        } catch {}

        isInitializedRef.current = true;
    }, []);

    // currency is not persisted to localStorage

    // Persist other booleans to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        writeBoolean(prefKeys.showPast, !!state.showPast);
    }, [state.showPast]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        writeBoolean(prefKeys.autoScroll, !!state.autoScroll);
    }, [state.autoScroll]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        writeBoolean(prefKeys.altNames, !!state.altNames);
    }, [state.altNames]);

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

            // Always reflect these in URL
            next.set('cur', state.currency);
            next.set('view', state.viewMode);

            // Remove no-longer-URL params
            next.delete('past');
            next.delete('scroll');
            next.delete('alt');

            // If no change, skip updating history
            if (curr.toString() === next.toString()) return;

            const newSearch = `?${next.toString()}`;
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            history.replaceState(null, '', newUrl);
        } catch {}
    }, [state.timezone, state.currency, state.viewMode]);

    return [state, updateState];
}
