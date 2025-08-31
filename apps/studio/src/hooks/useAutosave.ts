import { useCallback, useEffect, useRef } from 'react';
import { notifyError, notifySuccess, safeLocalStorage } from '../core/errors';

type UseAutosaveOptions = {
    key: string;
    delay: number;
    onSuccess?: () => void;
    onError?: () => void;
};

/**
 * LocalStorageへの自動保存を管理するHook
 * @param value 保存する値
 * @param options オプション
 * @returns saveNow: 即座に保存する関数
 */
export function useAutosave(value: string, options: UseAutosaveOptions) {
    const { key, delay, onSuccess, onError } = options;
    const timeoutRef = useRef<number | null>(null);

    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        const ok = safeLocalStorage.set(key, value);
        if (ok) {
            onSuccess?.() ?? notifySuccess('Saved');
        } else {
            onError?.() ?? notifyError('Failed to save');
        }
    }, [key, value, onSuccess, onError]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const save = () => {
            const ok = safeLocalStorage.set(key, value);
            if (ok) {
                onSuccess?.() ?? notifySuccess('Saved');
            } else {
                onError?.() ?? notifyError('Failed to save');
            }
        };

        timeoutRef.current = window.setTimeout(save, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [key, value, delay, onSuccess, onError]);

    return { saveNow };
}
