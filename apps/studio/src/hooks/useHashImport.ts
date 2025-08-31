import { useCallback, useEffect, useState } from 'react';
import { notifySuccess } from '../core/errors';
import { clearHash, decodeFromHashBase64, readHashPayload } from '../utils/hash';

type UseHashImportResult = {
    isDialogOpen: boolean;
    content: string | null;
    confirmImport: (saveFunction?: () => void) => void;
    cancelImport: () => void;
};

/**
 * ハッシュからのインポート処理を管理するHook
 * @param onContentLoaded コンテンツがロードされた時のコールバック
 * @returns ダイアログ状態と操作関数
 */
export function useHashImport(onContentLoaded?: (content: string) => void): UseHashImportResult {
    const [pendingHashContent, setPendingHashContent] = useState<string | null>(null);

    useEffect(() => {
        const raw = readHashPayload();
        if (raw) {
            const decoded = decodeFromHashBase64(raw);
            if (decoded !== null) {
                setPendingHashContent(decoded);
            }
        }
    }, []);

    const confirmImport = useCallback(
        (saveFunction?: () => void) => {
            if (pendingHashContent !== null) {
                onContentLoaded?.(pendingHashContent);
                saveFunction?.();
                notifySuccess('Loaded content from the shared URL');
            }
            setPendingHashContent(null);
            clearHash();
        },
        [pendingHashContent, onContentLoaded]
    );

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
