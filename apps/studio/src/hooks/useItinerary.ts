import { type ItineraryEvent, parseItineraryEvents } from '@itinerary-md/core';
import { useMemo, useRef } from 'react';
import YAML from 'yaml';
import type { ItinerarySummary } from '../types/itinerary';
import { useDebouncedValue } from './useDebouncedValue';

type UseItineraryResult = {
    previewContent: string;
    events: ItineraryEvent[];
    frontmatterTitle?: string;
    summary: ItinerarySummary;
};

/**
 * Markdownコンテンツから旅程データを解析するHook
 * パースエラー時は前回成功時の結果をキャッシュして返す（UIチラつき防止）
 * @param rawContent 生のMarkdownコンテンツ
 * @param previewDelay プレビュー遅延時間（デフォルト: 300ms）
 * @returns 解析された旅程データ
 */
export function useItinerary(rawContent: string, previewDelay = 300): UseItineraryResult {
    const previewContent = useDebouncedValue(rawContent, previewDelay);

    // 前回成功時のパース結果をキャッシュ
    const lastSuccessfulParseRef = useRef<{
        events: ItineraryEvent[];
        frontmatterTitle?: string;
        summary: ItinerarySummary;
    }>({
        events: [],
        frontmatterTitle: undefined,
        summary: {},
    });

    const events = useMemo(() => {
        // コンテンツが空の場合は空配列を返す
        if (!previewContent.trim()) {
            lastSuccessfulParseRef.current.events = [];
            return [];
        }

        try {
            const parsedEvents = parseItineraryEvents(previewContent);
            // パース成功時はキャッシュを更新
            lastSuccessfulParseRef.current.events = parsedEvents;
            return parsedEvents;
        } catch {
            // パース失敗時は前回成功時の結果を返す
            return lastSuccessfulParseRef.current.events;
        }
    }, [previewContent]);

    const frontmatterTitle = useMemo(() => {
        // コンテンツが空の場合はundefinedを返す
        if (!previewContent.trim()) {
            lastSuccessfulParseRef.current.frontmatterTitle = undefined;
            return undefined;
        }

        const frontmatterMatch = previewContent.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            // frontmatterがない場合はundefinedを返す（前回の値は使わない）
            lastSuccessfulParseRef.current.frontmatterTitle = undefined;
            return undefined;
        }

        try {
            const frontmatter = YAML.parse(frontmatterMatch[1]);
            const title = (frontmatter?.title as string) || undefined;
            // パース成功時はキャッシュを更新
            lastSuccessfulParseRef.current.frontmatterTitle = title;
            return title;
        } catch {
            // YAML パース失敗時は前回成功時の値を返す
            return lastSuccessfulParseRef.current.frontmatterTitle;
        }
    }, [previewContent]);

    const summary = useMemo(() => {
        // コンテンツが空の場合は空のサマリーを返す
        if (!previewContent.trim() || events.length === 0) {
            const emptySummary = {};
            lastSuccessfulParseRef.current.summary = emptySummary;
            return emptySummary;
        }

        try {
            const dates = events.map((e) => e.date).filter(Boolean) as string[];
            const uniqueDates = [...new Set(dates)].sort();

            const startDate = uniqueDates[0];
            const endDate = uniqueDates[uniqueDates.length - 1];
            let numDays: number | undefined;

            if (startDate && endDate) {
                const s = new Date(startDate);
                const e = new Date(endDate);
                const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                if (Number.isFinite(diff)) numDays = diff;
            }

            const newSummary = { startDate, endDate, numDays };
            // 計算成功時はキャッシュを更新
            lastSuccessfulParseRef.current.summary = newSummary;
            return newSummary;
        } catch {
            // 計算失敗時は前回成功時の値を返す
            return lastSuccessfulParseRef.current.summary;
        }
    }, [events, previewContent]);

    return {
        previewContent,
        events,
        frontmatterTitle,
        summary,
    };
}
