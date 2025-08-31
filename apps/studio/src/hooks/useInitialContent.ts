import { useCallback, useEffect, useState } from 'react';
import { notifyError, notifySuccess, safeLocalStorage } from '../core/errors';
import type { UseInitialContentOptions } from '../types/itinerary';

type UseInitialContentResult = {
    content: string;
    setContent: (content: string) => void;
    pendingLoadSample: boolean;
    loadSample: () => void;
    confirmLoadSample: () => Promise<void>;
    loadSampleWithSave: () => Promise<void>;
    cancelLoadSample: () => void;
};

/**
 * 初期コンテンツの読み込みを管理するHook
 * 優先度: hash -> storage -> sample.md
 * @param options オプション
 * @returns コンテンツ状態と操作関数
 */
export function useInitialContent(options: UseInitialContentOptions): UseInitialContentResult {
    const { storageKey, samplePath } = options;
    const [content, setContent] = useState('');
    const [pendingLoadSample, setPendingLoadSample] = useState(false);

    // 初期読み込み（hashは useHashImport で処理済みのため、storage -> sample の順）
    useEffect(() => {
        const initializeContent = async () => {
            // まず LocalStorage から読み込み試行
            const savedContent = safeLocalStorage.get(storageKey);
            if (savedContent && savedContent.trim() !== '') {
                setContent(savedContent);
                return;
            }

            // LocalStorage に有効なコンテンツがない場合は sample.md を読み込み
            try {
                const response = await fetch(samplePath);
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

    const loadSampleWithSave = confirmLoadSample;

    return {
        content,
        setContent,
        pendingLoadSample,
        loadSample,
        confirmLoadSample,
        cancelLoadSample,
        loadSampleWithSave,
    };
}
