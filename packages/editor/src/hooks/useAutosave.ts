import { useCallback, useEffect, useRef } from 'react';
import { notifyError, safeLocalStorage } from '../core/errors';
import type { UseAutosaveOptions } from '../types/itinerary';

/**
 * Hook that manages autosaving to LocalStorage (handles notifications internally).
 * @param value The content to save.
 * @param options Options.
 * @returns saveNow: A function that saves immediately.
 */
export function useAutosave(value: string, options: UseAutosaveOptions) {
    const { key, delay, onSuccess, onError = () => notifyError('Failed to save') } = options;
    const timeoutRef = useRef<number | null>(null);
    const lastSavedRef = useRef<string | null>(null);

    const save = useCallback(() => {
        if (lastSavedRef.current === value) return;
        const ok = safeLocalStorage.set(key, value);
        if (ok) {
            lastSavedRef.current = value;
            onSuccess?.();
        } else {
            onError?.();
        }
    }, [key, value, onSuccess, onError]);

    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        save();
    }, [save]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(save, Math.max(0, delay));

        const handleBeforeUnload = () => {
            saveNow();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [save, delay, saveNow]);

    return { saveNow };
}
