import { useCallback, useEffect, useState } from 'react';
import { notifySuccess } from '../core/errors';
import { clearHash, decodeFromHashBase64, readHashPayload } from '../utils/hash';

type UseHashImportResult = {
    isDialogOpen: boolean;
    content: string | null;
    confirmImport: () => void;
    cancelImport: () => void;
};

/**
 * Hook to manage importing content from the URL hash.
 * @param onContentLoaded Callback invoked when content has been loaded.
 * @param saveFunction Function to persist the loaded content.
 * @returns Dialog state and operation functions.
 */
export function useHashImport(onContentLoaded?: (content: string) => void, saveFunction?: () => void): UseHashImportResult {
    const [pendingHashContent, setPendingHashContent] = useState<string | null>(null);

    useEffect(() => {
        const handle = () => {
            const raw = readHashPayload();
            if (!raw) return;
            const decoded = decodeFromHashBase64(raw);
            if (decoded !== null) {
                setPendingHashContent(decoded);
            } else {
                setPendingHashContent(null);
                clearHash();
            }
        };
        handle();
        window.addEventListener('hashchange', handle);
        return () => window.removeEventListener('hashchange', handle);
    }, []);

    const confirmImport = useCallback(() => {
        try {
            if (pendingHashContent !== null) {
                onContentLoaded?.(pendingHashContent);
                saveFunction?.();
                notifySuccess('Loaded content from the shared URL');
            }
        } finally {
            setPendingHashContent(null);
            clearHash();
        }
    }, [pendingHashContent, onContentLoaded, saveFunction]);

    const cancelImport = useCallback(() => {
        setPendingHashContent(null);
        clearHash();
    }, []);

    return {
        isDialogOpen: pendingHashContent !== null,
        content: pendingHashContent,
        confirmImport,
        cancelImport,
    };
}
