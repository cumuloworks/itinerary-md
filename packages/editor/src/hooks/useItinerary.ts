// Do not use Core's event extraction directly in UI (remark → mdast → UI rendering)
import matter from 'gray-matter';
// import { normalizeCurrency, normalizeTimezone } from 'remark-itinerary/utils';
import { useMemo, useState } from 'react';
import YAML from 'yaml';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ItinerarySummary } from '@/types/itinerary';

type UseItineraryResult = {
  previewContent: string;
  frontmatterTitle?: string;
  frontmatterDescription?: string;
  frontmatterTags?: string[];
  summary: ItinerarySummary;
};

type Frontmatter = {
  frontmatterTitle?: string;
  frontmatterDescription?: string;
  frontmatterTags?: string[];
};

const EMPTY_FRONTMATTER: Frontmatter = {
  frontmatterTitle: undefined,
  frontmatterDescription: undefined,
  frontmatterTags: undefined,
};

/**
 * Parse title/description/tags from the YAML frontmatter.
 * @returns The parsed fields, or `null` when the frontmatter cannot be parsed
 */
function parseFrontmatter(content: string): Frontmatter | null {
  if (!content.trim()) return EMPTY_FRONTMATTER;
  try {
    const parsed = matter(content, {
      language: 'yaml',
      engines: { yaml: (s: string) => YAML.parse(s) },
    });

    const title = (parsed.data?.title as string) || undefined;

    const description =
      typeof parsed.data?.description === 'string'
        ? (parsed.data.description as string)
        : undefined;

    const raw = (parsed.data as any)?.tags as unknown;
    let tags: string[] | undefined;
    if (Array.isArray(raw)) {
      tags = raw
        .filter((v) => typeof v === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (typeof raw === 'string') {
      // Also support comma-separated string
      tags = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      tags = undefined;
    }
    // Deduplicate
    if (tags) tags = Array.from(new Set(tags));

    return {
      frontmatterTitle: title,
      frontmatterDescription: description,
      frontmatterTags: tags,
    };
  } catch {
    return null;
  }
}

/**
 * Hook to parse itinerary data from Markdown content
 * On parse errors, return the last successful result to avoid UI flicker
 * @param rawContent Raw Markdown content
 * @param previewDelay Preview debounce delay (default: 300ms)
 * @returns Parsed itinerary data
 */
export function useItinerary(
  rawContent: string,
  previewDelay = 300,
  _opts?: { timezone?: string }
): UseItineraryResult {
  const previewContent = useDebouncedValue(rawContent, previewDelay);

  const parsed = useMemo(
    () => parseFrontmatter(previewContent),
    [previewContent]
  );

  // The last successful parse is kept in state and adjusted during render
  // (React's "storing information from previous renders" pattern) so that a
  // transient YAML error while typing keeps showing the previous values.
  const [lastParsed, setLastParsed] = useState<Frontmatter>(
    () => parsed ?? EMPTY_FRONTMATTER
  );
  if (parsed !== null && parsed !== lastParsed) {
    setLastParsed(parsed);
  }
  const { frontmatterTitle, frontmatterDescription, frontmatterTags } =
    parsed ?? lastParsed;

  const summary = useMemo<ItinerarySummary>(() => {
    if (!previewContent.trim()) return {};

    // Here we only handle frontmatter title; date summary is extracted from mdast in Statistics
    const startDate = undefined;
    const endDate = undefined;
    let numDays: number | undefined;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff =
        Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (Number.isFinite(diff)) numDays = diff;
    }

    return { startDate, endDate, numDays };
  }, [previewContent]);

  return {
    previewContent,
    frontmatterTitle,
    frontmatterDescription,
    frontmatterTags,
    summary,
  };
}
