import type { Parent, PhrasingContent, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Position } from 'unist';
import { normalizePriceLine } from '../domain/price.js';
import { sliceInlineNodes } from '../mdast/index.js';
import type { Services } from '../services/index.js';
import type { ITMDHeadingNode } from '../types.js';
import { buildEventNode } from './build.js';
import { lexLine } from './lex.js';
import { normalizeHeader } from './normalize.js';
import { parseHeader, parseTimeSpan } from './parse.js';
import { validateHeader } from './validate.js';

function getHProps(obj: unknown): Record<string, unknown> {
    const hp = (obj as any)?.hProperties as unknown;
    return hp && typeof hp === 'object' ? (hp as Record<string, unknown>) : {};
}

export function assembleEvents(root: Root, sv: Services): Root {
    const parent = root as unknown as Parent;
    const children = Array.isArray(parent.children) ? parent.children : [];
    let currentDateISO: string | undefined;
    let currentDateTz: string | undefined;
    let currentTzValid: boolean | undefined;
    let currentTzWasInvalidOnHeading: boolean = false;

    for (let i = 0; i < children.length; i += 1) {
        const node = children[i] as unknown as {
            type?: string;
            children?: unknown[];
            position?: Position;
        };
        // Reset context on H1
        if (node?.type === 'heading' && (node as unknown as { depth?: number }).depth === 1) {
            currentDateISO = undefined;
            currentDateTz = undefined;
            currentTzValid = undefined;
            currentTzWasInvalidOnHeading = false;
            continue;
        }
        if (node?.type === 'heading' && (node as unknown as { depth?: number }).depth === 2) {
            const h = node as unknown as Parent & { type: 'heading' };
            const text = mdastToString(h as unknown as any).trim();
            const d = ((): {
                date?: string;
                timezone?: string;
                tzValid?: boolean;
                tzInvalidOnHeading?: boolean;
            } | null => {
                const m = text.match(/^(\d{4}-\d{2}-\d{2})(?:\s*@([A-Za-z0-9_./+:-]+))?/);
                if (!m) return null;
                const date = m[1];
                const tzRaw = m[2];
                const tzCheck = tzRaw ? sv.tz.coerce(tzRaw, sv.policy.tzFallback ?? undefined) : { tz: undefined, valid: true };
                const tzIsValid = tzCheck.valid;
                const tzUsed = tzCheck.tz ?? undefined;
                return {
                    date,
                    timezone: tzUsed,
                    tzValid: tzIsValid,
                    tzInvalidOnHeading: !!tzRaw && !tzIsValid,
                };
            })();
            currentDateISO = (d?.date as string | undefined) || currentDateISO;
            currentDateTz = (d?.timezone as string | undefined) || currentDateTz;
            currentTzValid = d?.tzValid ?? currentTzValid;
            currentTzWasInvalidOnHeading = !!d?.tzInvalidOnHeading;
            if (d?.date) {
                const headingNode: ITMDHeadingNode = {
                    type: 'itmdHeading',
                    dateISO: d.date,
                    timezone: d.timezone,
                    children: [],
                    position: (h as unknown as { position?: Position }).position,
                    data: { hProperties: { 'data-itmd-date': d.date } },
                } as ITMDHeadingNode;
                children[i] = headingNode as unknown as Parent['children'][number];
            } else {
                currentDateISO = undefined;
                currentDateTz = undefined;
                currentTzValid = undefined;
                currentTzWasInvalidOnHeading = false;
            }
            continue;
        }
        if (currentDateISO && node) {
            const dataPrev = ((node as unknown as { data?: Record<string, unknown> }).data || {}) as Record<string, unknown>;
            const hPropsPrev = getHProps(dataPrev as any);
            (node as unknown as { data?: Record<string, unknown> }).data = {
                ...dataPrev,
                itmdDate: { dateISO: currentDateISO, timezone: currentDateTz },
                hProperties: { ...hPropsPrev, 'data-itmd-date': currentDateISO },
            } as Record<string, unknown>;
        }
        if (node?.type !== 'blockquote') continue;

        const bq = node as unknown as Parent & { type: 'blockquote' };
        const blockChildren = Array.isArray(bq.children) ? (bq.children as unknown as Parent['children']) : ([] as Parent['children']);
        const firstPara = blockChildren.find((n) => (n as unknown as { type?: string }).type === 'paragraph') as (Parent & { type: 'paragraph' }) | undefined;
        if (!firstPara) continue;

        const inline = (firstPara.children ?? []) as unknown[] as PhrasingContent[];
        const paraText = mdastToString(firstPara as unknown as any);
        const nlIdx = paraText.indexOf('\n');
        const firstLineText = nlIdx >= 0 ? paraText.slice(0, nlIdx) : paraText;
        const firstTrim = firstLineText.trimStart();
        const gate = parseTimeSpan(firstTrim);
        if (gate.consumed === 0) continue;

        const tokens = lexLine(paraText, {}, sv);
        const parsed = parseHeader(tokens, inline, sv);
        const normalized = normalizeHeader(
            parsed,
            {
                baseTz: currentDateTz ?? sv.policy.tzFallback ?? undefined,
                dateISO: currentDateISO,
            },
            sv
        );
        const { header, warnings } = validateHeader(normalized, sv);

        if (!header.eventType || String(header.eventType).trim() === '') {
            continue;
        }

        const bodySegs: Array<
            | { kind: 'inline'; content: PhrasingContent[] }
            | {
                  kind: 'meta';
                  entries: Array<{ key: string; value: PhrasingContent[] }>;
              }
            | {
                  kind: 'list';
                  items: PhrasingContent[][];
                  ordered?: boolean;
                  start?: number | null;
              }
        > = [];
        for (const nodeAbs of blockChildren) {
            if (nodeAbs === firstPara) continue; // exclude header paragraph
            const t = (nodeAbs as unknown as { type?: string }).type;
            if (t === 'paragraph') {
                const inlinePara = ((nodeAbs as unknown as Parent & { type: 'paragraph' }).children ?? []) as unknown as PhrasingContent[];
                bodySegs.push({ kind: 'inline', content: inlinePara });
                continue;
            }
            if (t === 'list') {
                // Group list meta (key:value) and non-KV items in appearance order into bodySegs
                type GroupState =
                    | null
                    | {
                          kind: 'meta';
                          entries: Array<{ key: string; value: PhrasingContent[] }>;
                      }
                    | {
                          kind: 'list';
                          items: PhrasingContent[][];
                          ordered?: boolean;
                          start?: number | null;
                      };
                let group: GroupState = null;
                const flush = () => {
                    if (!group) return;
                    if (group.kind === 'meta' && group.entries.length > 0) bodySegs.push({ kind: 'meta', entries: group.entries });
                    if (group.kind === 'list' && group.items.length > 0)
                        bodySegs.push({
                            kind: 'list',
                            items: group.items,
                            ordered: group.ordered,
                            start: group.start,
                        });
                    group = null;
                };
                const list = nodeAbs as unknown as Parent & {
                    type: 'list';
                    ordered?: boolean;
                    start?: number | null;
                };
                const listOrdered = !!(list as unknown as { ordered?: boolean }).ordered;
                const listStart = (list as unknown as { start?: number }).start ?? null;
                const items = Array.isArray(list.children) ? list.children : [];
                for (const it of items) {
                    const li = it as unknown as Parent & { type?: string };
                    const kids = Array.isArray(li.children) ? li.children : [];
                    const para0 = kids.find((n) => (n as unknown as { type?: string })?.type === 'paragraph') as (Parent & { type: 'paragraph' }) | undefined;
                    const inlineLi = (para0?.children ?? []) as unknown as PhrasingContent[];
                    const raw = para0 ? mdastToString(para0 as unknown as any) : mdastToString(li as unknown as any);
                    const rawText = String(raw || '');
                    const textTrimmed = rawText.trim();
                    const idx = rawText.indexOf(':');
                    const isKv = idx > 0;
                    if (isKv) {
                        const keyRaw = rawText.slice(0, idx).trim().toLowerCase();
                        const key = keyRaw.replace(/^[-\s]+/, '');
                        let valStart = idx + 1;
                        if (rawText[valStart] === ' ') valStart += 1;
                        const valueNodes = inlineLi.length > 0 ? sliceInlineNodes(inlineLi, valStart, rawText.length) : ([{ type: 'text', value: rawText.slice(valStart).trim() }] as any);
                        if (key) {
                            if (!group || group.kind !== 'meta') {
                                flush();
                                group = { kind: 'meta', entries: [] } as GroupState;
                            }
                            (group as Extract<GroupState, { kind: 'meta' }>).entries.push({
                                key,
                                value: valueNodes as unknown as PhrasingContent[],
                            });
                        }
                    } else {
                        const inlineNodes = inlineLi.length > 0 ? inlineLi : ([{ type: 'text', value: textTrimmed }] as any);
                        if (Array.isArray(inlineNodes) && inlineNodes.length > 0) {
                            const first = inlineNodes[0] as unknown as {
                                type?: string;
                                value?: string;
                            };
                            if (first && first.type === 'text' && typeof first.value === 'string' && first.value.startsWith('- ')) {
                                (first as { value: string }).value = first.value.slice(2);
                            }
                        }
                        if (!group || group.kind !== 'list') {
                            flush();
                            group = {
                                kind: 'list',
                                items: [],
                                ordered: listOrdered,
                                start: listStart,
                            } as GroupState;
                        }
                        const gl = group as Extract<GroupState, { kind: 'list' }>;
                        gl.items.push(inlineNodes as unknown as PhrasingContent[]);
                    }
                }
                flush();
            }
        }

        // children: the entire blockquote (including the first paragraph)
        const childrenOut: Parent['children'] = blockChildren;
        const combinedPos = bq.position as Position | undefined;
        const built = buildEventNode(header, childrenOut as any, combinedPos, sv);
        (built as any).body = bodySegs.length > 0 ? (bodySegs as any) : null;

        // Normalize price/cost meta entries (no calculation; currency+amount only)
        const priceEntries: Array<{
            key: string;
            raw: string;
            price: ReturnType<typeof normalizePriceLine>;
        }> = [];
        for (const seg of bodySegs) {
            if ((seg as { kind?: string }).kind !== 'meta') continue;
            const m = seg as {
                kind: 'meta';
                entries: Array<{ key: string; value: PhrasingContent[] }>;
            };
            for (const e of m.entries) {
                if (e.key === 'price' || e.key === 'cost') {
                    const rawStr = mdastToString({
                        type: 'paragraph',
                        children: e.value,
                    } as unknown as any).trim();
                    const priceNode = normalizePriceLine(rawStr, sv.policy.currencyFallback ?? undefined);
                    priceEntries.push({ key: e.key, raw: rawStr, price: priceNode });
                }
            }
        }
        if (priceEntries.length > 0) {
            const prevData = ((built as unknown as { data?: Record<string, unknown> }).data || {}) as Record<string, unknown>;
            (built as unknown as { data?: Record<string, unknown> }).data = {
                ...prevData,
                itmdPrice: priceEntries,
            } as Record<string, unknown>;
        }
        built.warnings = [...(built.warnings ?? []), ...warnings];
        // add timezone invalid warning if heading had an invalid tz annotation
        if (currentTzWasInvalidOnHeading) {
            built.warnings.push('invalid-tz');
        }
        if (currentDateISO) {
            const prev = ((built as unknown as { data?: Record<string, unknown> }).data || {}) as Record<string, unknown>;
            const hPropsPrev = getHProps(prev as any);
            (built as unknown as { data?: Record<string, unknown> }).data = {
                ...prev,
                itmdDate: { dateISO: currentDateISO, timezone: currentDateTz },
                hProperties: { ...hPropsPrev, 'data-itmd-date': currentDateISO },
            } as Record<string, unknown>;
        }
        children[i] = built as unknown as Parent['children'][number];
    }

    return root;
}
