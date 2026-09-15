import matter from 'gray-matter';
import { DateTime } from 'luxon';
import type { PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import React, { type FC, memo } from 'react';
import remarkGfm from 'remark-gfm';
import remarkItinerary from 'remark-itinerary';
import remarkItineraryAlert from 'remark-itinerary-alert';
import { normalizeCurrency, normalizeTimezone } from 'remark-itinerary/utils';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { Statistics } from '@/components/itinerary/Statistics';
import { createRenderBlock } from '@/components/render';

import 'highlight.js/styles/github.css';
import type { MdNode } from '@/components/render/types';
import { Tags } from '@/components/Tags';
import { notifyError } from '@/core/errors';
import { tInstant } from '@/i18n';
import {
  findBestTargetForLine,
  isElementVisibleWithin,
  scrollElementIntoCenteredView,
} from '@/utils/dom';
// import { normalizeCurrencyCode } from '@/utils/currency';
import { isValidIanaTimeZone } from '@/utils/timezone';

interface MarkdownPreviewProps {
  content: string;
  timezone?: string;
  currency?: string;
  rate?: { from: string; to: string; value: number };
  title?: string;
  description?: string;
  tags?: string[];
  showPast?: boolean;
  scrollToRatio?: number;
  activeLine?: number;
  autoScroll?: boolean;
  onShowPast?: () => void;
  preferAltNames?: boolean;
  externalContainerRef?: React.Ref<HTMLDivElement>;
  onTimezoneChange?: (timezone: string) => void;
}

//

type TextSegment = { text: string; url?: string; kind?: 'text' | 'code' };

const inlineToSegments = (
  inline?: PhrasingContent[] | null
): TextSegment[] | undefined => {
  if (!inline || !Array.isArray(inline)) return undefined;
  const segs: TextSegment[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === 'text' && typeof n.value === 'string')
      segs.push({ text: n.value });
    else if (n.type === 'inlineCode' && typeof n.value === 'string')
      segs.push({ text: n.value, kind: 'code' });
    else if (n.type === 'link' && typeof n.url === 'string') {
      const text = (mdastToString as any)(n);
      segs.push({ text, url: n.url });
    } else if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  inline.forEach(walk);
  return segs;
};

const segmentsToPlainText = (segments?: TextSegment[]): string | undefined =>
  Array.isArray(segments) ? segments.map((s) => s.text).join('') : undefined;

const getNodeDateAttr = (n: unknown): string | undefined => {
  try {
    const d = (n as { data?: { hProperties?: Record<string, unknown> } })?.data
      ?.hProperties as Record<string, unknown> | undefined;
    const v = d && (d['data-itmd-date'] as unknown);
    return typeof v === 'string' && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
};

type ParsedRoot = Root & { children?: MdNode[] };

type ParsedDocument = {
  root: ParsedRoot;
  frontmatter: Record<string, unknown>;
  isItmd: boolean;
  defaultTimezone?: string;
  /** Number of source lines occupied by the frontmatter block (0 when absent). */
  frontmatterOffset: number;
  lastStaySegmentsByDate: Map<string, Array<{ text: string; url?: string }>>;
};

// Parses frontmatter + markdown into an mdast tree; returns null when parsing
// fails so the preview falls back to an empty body. No JSX is built in here on
// purpose: a try/catch cannot catch React render errors (that is the job of
// MarkdownPreviewErrorBoundary).
const parseDocument = (
  content: string,
  timezone?: string,
  currency?: string
): ParsedDocument | null => {
  try {
    const fm = matter(content);
    const fmTimezoneRaw =
      typeof (fm.data as any)?.timezone === 'string'
        ? (fm.data as any).timezone
        : undefined;
    const fmCurrencyRaw =
      typeof (fm.data as any)?.currency === 'string'
        ? (fm.data as any).currency
        : undefined;
    const fmType =
      typeof (fm.data as any)?.type === 'string'
        ? String((fm.data as any).type)
            .trim()
            .toLowerCase()
        : undefined;
    const isItmdDoc =
      fmType === 'itmd' || fmType === 'itinerary-md' || fmType === 'tripmd';
    const normalizedTimezone =
      normalizeTimezone(fmTimezoneRaw || timezone || null, null) || undefined;
    const normalizedCurrency = normalizeCurrency(
      fmCurrencyRaw || currency || 'USD',
      'USD'
    );
    const defaultTimezone = normalizedTimezone || undefined;
    const mdProcessor = (unified as any)().use(remarkParse).use(remarkGfm);
    if (isItmdDoc) {
      (mdProcessor as any)
        .use(remarkItineraryAlert as any)
        .use(remarkItinerary as any, {
          defaultTimezone,
          defaultCurrency: normalizedCurrency,
        });
    }
    const mdast = mdProcessor.parse(fm.content || content) as unknown as Root;
    const transformed = mdProcessor.runSync(mdast) as unknown as ParsedRoot;
    const prefixLength =
      typeof fm.content === 'string' ? content.length - fm.content.length : 0;
    const frontmatterOffset =
      prefixLength > 0
        ? (content.slice(0, prefixLength).match(/\r?\n/g) || []).length
        : 0;
    const lastStaySegmentsByDate = new Map<
      string,
      Array<{ text: string; url?: string }>
    >();
    let currentDate: { date: string; tz?: string } | undefined;
    for (const node of (transformed.children || []) as MdNode[]) {
      if ((node as { type?: string }).type === 'itmdHeading') {
        const d = node as unknown as {
          type: string;
          dateISO?: string;
          timezone?: string;
        };
        if (d.dateISO) {
          currentDate = { date: d.dateISO, tz: d.timezone };
        }
        continue;
      }
      if ((node as { type?: string })?.type === 'itmdEvent') {
        try {
          if (currentDate) {
            const ev = node as unknown as {
              baseType?: string;
              destination?: {
                to?: PhrasingContent[];
                at?: PhrasingContent[];
              };
            };
            if (ev?.baseType === 'stay') {
              try {
                const inline = ev.destination?.at as
                  | PhrasingContent[]
                  | undefined;
                const segs = inlineToSegments(inline) || [];
                if (segs.length > 0)
                  lastStaySegmentsByDate.set(currentDate.date, segs);
              } catch {}
            }
          }
        } catch {}
      }
      // attrDate computation kept for potential future stats; no longer used for banner
      // const attrDate = getNodeDateAttr(node);
    }
    return {
      root: transformed,
      frontmatter: {
        ...fm.data,
        timezone: normalizedTimezone ?? (fm.data as any)?.timezone,
        currency: normalizedCurrency,
      } as Record<string, unknown>,
      isItmd: isItmdDoc,
      defaultTimezone,
      frontmatterOffset,
      lastStaySegmentsByDate,
    };
  } catch {
    return null;
  }
};

type PreviewModel = {
  reactContent: React.ReactNode;
  root: ParsedRoot | null;
  parsedFrontmatter: Record<string, unknown>;
  isItmd: boolean;
};

const EMPTY_PREVIEW: PreviewModel = {
  reactContent: null,
  root: null,
  parsedFrontmatter: {},
  isItmd: false,
};

// Divider rendered in place of a run of hidden past events
const PastEventsBanner: FC<{ onShowPast?: () => void }> = ({ onShowPast }) => (
  <div className="mt-6 mb-4 flex items-center text-xs text-gray-500">
    <span className="flex-1 border-t border-gray-200" />
    <span className="px-2">
      Past events are hidden —{' '}
      <button
        type="button"
        onClick={onShowPast}
        className="underline hover:text-gray-700"
      >
        Click to show
      </button>
    </span>
    <span className="flex-1 border-t border-gray-200" />
  </div>
);

// moved to utils/dom.ts

const MarkdownPreviewComponent: FC<MarkdownPreviewProps> = ({
  content,
  timezone,
  currency,
  rate,
  showPast,
  title,
  description,
  tags,
  activeLine,
  autoScroll = true,
  onShowPast,
  preferAltNames,
  externalContainerRef,
  onTimezoneChange,
}) => {
  const displayTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const showPastEffective = typeof showPast === 'boolean' ? showPast : true;

  const { reactContent, root, parsedFrontmatter, isItmd } =
    React.useMemo<PreviewModel>(() => {
      const parsed = parseDocument(content, timezone, currency);
      if (!parsed) return EMPTY_PREVIEW;

      const { frontmatterOffset } = parsed;
      const getLineStart = (
        n: { position?: { start?: { line?: number } } } | undefined
      ): number | undefined => {
        const l = n?.position?.start?.line as number | undefined;
        return typeof l === 'number' ? l + frontmatterOffset : undefined;
      };
      const getLineEnd = (
        n: { position?: { end?: { line?: number } } } | undefined
      ): number | undefined => {
        const l = n?.position?.end?.line as number | undefined;
        return typeof l === 'number' ? l + frontmatterOffset : undefined;
      };
      const zoneForCompare =
        timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isPastISODate = (iso?: string): boolean => {
        if (!iso) return false;
        try {
          const today = DateTime.now().setZone(zoneForCompare).startOf('day');
          const day = DateTime.fromISO(iso, { zone: zoneForCompare }).startOf(
            'day'
          );
          return day < today;
        } catch {
          return false;
        }
      };

      const renderBlock = createRenderBlock({
        getLineStart,
        getLineEnd,
        getNodeDateAttr,
        displayTimezone,
        defaultTimezone: parsed.defaultTimezone,
        currency,
        lastStaySegmentsByDate: parsed.lastStaySegmentsByDate,
        inlineToSegments,
        segmentsToPlainText,
        preferAltNames,
        onTimezoneClick: onTimezoneChange,
      });

      const els: React.ReactNode[] = [];
      let sawAnyHidden = false;
      let inHiddenRun = false;
      for (const [idx, node] of (
        (parsed.root.children || []) as MdNode[]
      ).entries()) {
        const attr = getNodeDateAttr(node);
        const isHidden = !showPastEffective && isPastISODate(attr);
        if (isHidden) {
          sawAnyHidden = true;
          inHiddenRun = true;
          continue;
        }
        if (inHiddenRun) {
          const lineStart = getLineStart(node);
          els.push(
            <PastEventsBanner
              key={`past-banner-${lineStart ?? idx}`}
              onShowPast={onShowPast}
            />
          );
          inHiddenRun = false;
        }
        const rendered = renderBlock(node as any, idx);
        if (rendered) els.push(rendered);
      }
      if (els.length === 0 && sawAnyHidden) {
        els.push(
          <PastEventsBanner key="past-banner-only" onShowPast={onShowPast} />
        );
      }
      return {
        reactContent: <>{els}</>,
        root: parsed.root,
        parsedFrontmatter: parsed.frontmatter,
        isItmd: parsed.isItmd,
      };
    }, [
      content,
      timezone,
      currency,
      showPastEffective,
      displayTimezone,
      onShowPast,
      preferAltNames,
      onTimezoneChange,
    ]);

  const frontmatterTz =
    typeof parsedFrontmatter.timezone === 'string'
      ? parsedFrontmatter.timezone
      : undefined;
  React.useEffect(() => {
    if (frontmatterTz && !isValidIanaTimeZone(frontmatterTz)) {
      notifyError(
        tInstant('toast.frontmatter.tz.invalid', { tz: frontmatterTz })
      );
    }
  }, [frontmatterTz]);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const highlightTimeoutRef = React.useRef<number | undefined>(undefined);

  // Hands the container element to the parent-provided ref without mutating a
  // prop from inside a ref callback (which the React Compiler rejects).
  React.useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    externalContainerRef,
    () => containerRef.current,
    []
  );

  // Highlight current block for activeLine
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // clear previous highlights
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = undefined;
    }
    for (const el of Array.from(
      container.querySelectorAll<HTMLElement>('.itmd-active')
    )) {
      el.classList.remove('itmd-active');
    }
    if (!activeLine) return;
    const line = activeLine;
    const { target, boxTarget } = findBestTargetForLine(container, line);
    if (!target) return;
    const applyEl = (boxTarget || target) as HTMLElement;
    applyEl.classList.add('itmd-active');
    // auto-remove highlight after 2 seconds
    highlightTimeoutRef.current = window.setTimeout(() => {
      applyEl.classList.remove('itmd-active');
      highlightTimeoutRef.current = undefined;
    }, 2000);
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = undefined;
      }
    };
  }, [activeLine]);

  React.useEffect(() => {
    if (!autoScroll) return;
    if (!activeLine || !containerRef.current) return;
    const container = containerRef.current;
    const { target, boxTarget } = findBestTargetForLine(container, activeLine);
    if (!target) return;
    const applyEl = (boxTarget || target) as HTMLElement;
    const visible = isElementVisibleWithin(container, applyEl, 8);
    if (visible) return;
    scrollElementIntoCenteredView(container, applyEl);
  }, [activeLine, autoScroll]);

  return (
    <div
      ref={containerRef}
      className="markdown-preview h-full space-y-4 overflow-auto bg-white px-8 py-4"
    >
      {title && (
        <h1 className="mt-6 ml-0 text-4xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
      )}
      {description && (
        <p className="tracking-tight text-gray-600">{description}</p>
      )}
      {Array.isArray(tags) && tags.length > 0 && <Tags tags={tags} />}
      {isItmd && (
        <Statistics
          root={root as any}
          frontmatter={parsedFrontmatter}
          currency={currency}
          rate={rate}
        />
      )}
      {reactContent}
    </div>
  );
};

export const MarkdownPreview = memo(MarkdownPreviewComponent);
