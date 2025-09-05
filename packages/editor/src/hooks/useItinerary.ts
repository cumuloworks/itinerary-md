// Coreのイベント抽出はUI側で直接使わない（remark→mdast→UIレンダリング）
import matter from 'gray-matter';
import { useMemo, useRef } from 'react';
import YAML from 'yaml';
import type { ItinerarySummary } from '../types/itinerary';
import { useDebouncedValue } from './useDebouncedValue';

type UseItineraryResult = {
    previewContent: string;
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
export function useItinerary(rawContent: string, previewDelay = 300, _opts?: { timezone?: string }): UseItineraryResult {
    const previewContent = useDebouncedValue(rawContent, previewDelay);

    const lastSuccessfulParseRef = useRef<{
        frontmatterTitle?: string;
        summary: ItinerarySummary;
    }>({ frontmatterTitle: undefined, summary: {} });

    // 旧: events は UI 側で直接使わないため削除

    const frontmatterTitle = useMemo(() => {
        if (!previewContent.trim()) {
            lastSuccessfulParseRef.current.frontmatterTitle = undefined;
            return undefined;
        }
        try {
            const parsed = matter(previewContent, { language: 'yaml', engines: { yaml: (s: string) => YAML.parse(s) } });
            const title = (parsed.data?.title as string) || undefined;
            lastSuccessfulParseRef.current.frontmatterTitle = title;
            return title;
        } catch {
            return lastSuccessfulParseRef.current.frontmatterTitle;
        }
    }, [previewContent]);

    const summary = useMemo(() => {
        if (!previewContent.trim()) {
            const emptySummary = {};
            lastSuccessfulParseRef.current.summary = emptySummary;
            return emptySummary;
        }

        try {
            // ここではfrontmatterタイトルのみ扱い、日付要約はStatistics側でmdastから抽出
            const startDate = undefined;
            const endDate = undefined;
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
    }, [previewContent]);

    return {
        previewContent,
        frontmatterTitle,
        summary,
    };
}
