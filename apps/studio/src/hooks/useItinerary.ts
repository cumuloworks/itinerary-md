import { type ItineraryEvent, parseItineraryEvents } from '@itinerary-md/core';
import { useMemo } from 'react';
import YAML from 'yaml';
import { useDebouncedValue } from './useDebouncedValue';

type ItinerarySummary = {
    startDate?: string;
    endDate?: string;
    numDays?: number;
};

type UseItineraryResult = {
    previewContent: string;
    events: ItineraryEvent[];
    frontmatterTitle?: string;
    summary: ItinerarySummary;
};

/**
 * Markdownコンテンツから旅程データを解析するHook
 * @param rawContent 生のMarkdownコンテンツ
 * @param previewDelay プレビュー遅延時間（デフォルト: 300ms）
 * @returns 解析された旅程データ
 */
export function useItinerary(rawContent: string, previewDelay = 300): UseItineraryResult {
    const previewContent = useDebouncedValue(rawContent, previewDelay);

    const events = useMemo(() => {
        return parseItineraryEvents(previewContent);
    }, [previewContent]);

    const frontmatterTitle = useMemo(() => {
        const frontmatterMatch = previewContent.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) return undefined;

        try {
            const frontmatter = YAML.parse(frontmatterMatch[1]);
            return (frontmatter?.title as string) || undefined;
        } catch {
            return undefined;
        }
    }, [previewContent]);

    const summary = useMemo(() => {
        const dates = events.map((e) => e.date).filter(Boolean) as string[];
        const uniqueDates = [...new Set(dates)].sort();

        const startDate = uniqueDates[0];
        const endDate = uniqueDates[uniqueDates.length - 1];
        let numDays: number | undefined;

        if (startDate && endDate) {
            try {
                const s = new Date(startDate);
                const e = new Date(endDate);
                const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                if (Number.isFinite(diff)) numDays = diff;
            } catch {
                // 日付の解析に失敗した場合はnumDaysをundefinedのまま
            }
        }

        return { startDate, endDate, numDays };
    }, [events]);

    return {
        previewContent,
        events,
        frontmatterTitle,
        summary,
    };
}
