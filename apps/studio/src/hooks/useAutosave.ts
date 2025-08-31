import { useCallback, useEffect, useRef } from 'react';
import { notifyError, notifySuccess, safeLocalStorage } from '../core/errors';
import type { UseAutosaveOptions } from '../types/itinerary';

/**
 * LocalStorageへの自動保存を管理するHook（通知も内部で処理）
 * @param value 保存する値
 * @param options オプション
 * @returns saveNow: 即座に保存する関数
 */
export function useAutosave(value: string, options: UseAutosaveOptions) {
    const { key, delay, onSuccess = () => notifySuccess('Saved'), onError = () => notifyError('Failed to save') } = options;
    const timeoutRef = useRef<number | null>(null);

    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        const ok = safeLocalStorage.set(key, value);
        if (ok) {
            onSuccess();
        } else {
            onError();
        }
    }, [key, value, onSuccess, onError]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const save = () => {
            const ok = safeLocalStorage.set(key, value);
            if (ok) {
                onSuccess();
            } else {
                onError();
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
