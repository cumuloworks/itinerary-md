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
        if (!previewContent.trim()) {
            lastSuccessfulParseRef.current.events = [];
            return [];
        }

        try {
            const parsedEvents = parseItineraryEvents(previewContent);
            lastSuccessfulParseRef.current.events = parsedEvents;
            return parsedEvents;
        } catch {
            return lastSuccessfulParseRef.current.events;
        }
    }, [previewContent]);

    const frontmatterTitle = useMemo(() => {
        if (!previewContent.trim()) {
            lastSuccessfulParseRef.current.frontmatterTitle = undefined;
            return undefined;
        }

        const frontmatterMatch = previewContent.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);

        if (!frontmatterMatch) {
            lastSuccessfulParseRef.current.frontmatterTitle = undefined;
            return undefined;
        }

        try {
            const frontmatter = YAML.parse(frontmatterMatch[1]);
            const title = (frontmatter?.title as string) || undefined;
            lastSuccessfulParseRef.current.frontmatterTitle = title;
            return title;
        } catch {
            return lastSuccessfulParseRef.current.frontmatterTitle;
        }
    }, [previewContent]);

    const summary = useMemo(() => {
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
            lastSuccessfulParseRef.current.summary = newSummary;
            return newSummary;
        } catch {
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
