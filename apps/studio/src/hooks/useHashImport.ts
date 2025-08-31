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
 * ハッシュからのインポート処理を管理するHook
 * @param onContentLoaded コンテンツがロードされた時のコールバック
 * @param saveFunction 保存処理の関数
 * @returns ダイアログ状態と操作関数
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
