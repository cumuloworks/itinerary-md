import { useCallback, useEffect, useState } from 'react';
import { notifyError, notifySuccess, safeLocalStorage } from '../core/errors';
import type { UseInitialContentOptions } from '../types/itinerary';

type UseInitialContentResult = {
    content: string;
    setContent: (content: string) => void;
    pendingLoadSample: boolean;
    loadSample: () => void;
    confirmLoadSample: () => Promise<void>;

    cancelLoadSample: () => void;
};

/**
 * Hook to manage loading initial content.
 * Priority: hash -> storage -> sample.md
 * @param options Options.
 * @returns Content state and operation functions.
 */
export function useInitialContent(options: UseInitialContentOptions): UseInitialContentResult {
    const { storageKey, samplePath } = options;
    const [content, setContent] = useState('');
    const [pendingLoadSample, setPendingLoadSample] = useState(false);

    useEffect(() => {
        const ac = new AbortController();
        const initializeContent = async () => {
            const savedContent = safeLocalStorage.get(storageKey);
            if (savedContent && savedContent.trim() !== '') {
                setContent(savedContent);
                return;
            }

            try {
                const response = await fetch(samplePath, { signal: ac.signal });
                if (response.ok) {
                    const text = await response.text();
                    setContent(text);
                } else {
                    notifyError(`Failed to load ${samplePath}`);
                }
            } catch (error) {
                console.error(`Failed to load ${samplePath}:`, error);
                notifyError(`Failed to load ${samplePath}`);
            }
        };

        initializeContent();
        return () => ac.abort();
    }, [storageKey, samplePath]);

    const loadSample = useCallback(() => {
        setPendingLoadSample(true);
    }, []);

    const confirmLoadSample = useCallback(async () => {
        try {
            const response = await fetch(samplePath);
            if (response.ok) {
                const text = await response.text();
                setContent(text);
                notifySuccess('Sample itinerary loaded');
            } else {
                notifyError(`Failed to load ${samplePath}`);
            }
        } catch (error) {
            console.error(`Failed to load ${samplePath}:`, error);
            notifyError(`Failed to load ${samplePath}`);
        } finally {
            setPendingLoadSample(false);
        }
    }, [samplePath]);

    const cancelLoadSample = useCallback(() => {
        setPendingLoadSample(false);
    }, []);

    return {
        content,
        setContent,
        pendingLoadSample,
        loadSample,
        confirmLoadSample,
        cancelLoadSample,
    };
}
