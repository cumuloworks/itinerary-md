import { useCallback, useEffect, useState } from 'react';

import { notifyError } from '@/core/errors';
import { tInstant } from '@/i18n';
import type { TopbarState, ViewMode } from '@/types/itinerary';
import { prefKeys, readBoolean, writeBoolean } from '@/utils/prefs';
import { isValidIanaTimeZone } from '@/utils/timezone';

// currency is managed only via URL query; no localStorage key

const VIEW_VALUES: ReadonlySet<ViewMode> = new Set([
  'split',
  'editor',
  'preview',
]);

// Default values for flags that are persisted in local storage
const DEFAULTS = {
  showPast: true,
  autoScroll: true,
  altNames: false,
} as const;

type UrlParams = {
  patch: Partial<TopbarState>;
  /** The `tz` query value when it is not a valid IANA timezone */
  invalidTimezone?: string;
};

// Pure read of tz/cur/view from the URL query (no side effects), so it can run
// inside the lazy state initializer as well as in effects.
function readUrlParams(): UrlParams {
  const patch: Partial<TopbarState> = {};
  let invalidTimezone: string | undefined;
  try {
    const searchParams = new URLSearchParams(window.location.search);

    const tz = searchParams.get('tz');
    if (tz) {
      if (isValidIanaTimeZone(tz)) {
        patch.timezone = tz;
      } else {
        invalidTimezone = tz;
      }
    }

    const cur = searchParams.get('cur');
    if (cur) patch.currency = cur;

    const view = searchParams.get('view');
    if (view && VIEW_VALUES.has(view as ViewMode)) {
      patch.viewMode = view as ViewMode;
    }

    // Do not read past/scroll/alt from URL
  } catch {}
  return { patch, invalidTimezone };
}

function createInitialState(): TopbarState {
  const base: TopbarState = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    viewMode: 'split',
    showPast: true,
    autoScroll: true,
    showMdast: false,
    altNames: false,
  };
  if (typeof window === 'undefined') return base;
  return {
    ...base,
    // Load persisted values for non-URL flags from localStorage
    showPast: readBoolean(prefKeys.showPast, DEFAULTS.showPast),
    autoScroll: readBoolean(prefKeys.autoScroll, DEFAULTS.autoScroll),
    altNames: readBoolean(prefKeys.altNames, DEFAULTS.altNames),
    ...readUrlParams().patch,
  };
}

/**
 * Hook to manage Topbar state (initialization and sync are separated).
 * @returns [state, setState] - State and update function.
 */
export function useTopbarState(): [
  TopbarState,
  (patch: Partial<TopbarState>) => void,
] {
  // localStorage and URL are read once in the lazy initializer, so the first
  // render already holds the initial state instead of patching it from effects.
  const [state, setState] = useState<TopbarState>(createInitialState);

  // Report an invalid `tz` query param. This must stay ahead of the URL sync
  // effect below, which overwrites `tz` in the URL on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { invalidTimezone } = readUrlParams();
    if (invalidTimezone) {
      notifyError(tInstant('toast.url.tz.invalid', { tz: invalidTimezone }));
    }
  }, []);

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
      // Do not reflect prefs booleans in URL

      // If no change, skip updating history
      if (curr.toString() === next.toString()) return;

      const newSearch = `?${next.toString()}`;
      const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
      history.replaceState(null, '', newUrl);
    } catch {}
  }, [state.timezone, state.currency, state.viewMode]);

  return [state, updateState];
}
