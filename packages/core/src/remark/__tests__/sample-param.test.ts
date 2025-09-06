import fs from 'node:fs';
import path from 'node:path';
import type { PhrasingContent, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';
import { remarkItinerary } from '../itinerary';

function toItineraryEvents(root: Root): { type: string; titleText?: string }[] {
    const out: { type: string; titleText?: string }[] = [];
    visit(root as unknown as { type: string }, 'itmdEvent', (n: unknown) => {
        const node = n as {
            eventType: string;
            title?: PhrasingContent[] | unknown;
        };
        const titleText = Array.isArray(node.title) ? (node.title as PhrasingContent[]).map((t) => (typeof (t as unknown as { value?: unknown }).value === 'string' ? (t as unknown as { value: string }).value : '')).join('') : undefined;
        out.push({ type: node.eventType, titleText });
    });
    return out;
}

describe('sample files parametric', () => {
    const sampleFiles = ['sample_en.md', 'sample_ja.md'];

    for (const sampleFile of sampleFiles) {
        describe(sampleFile, () => {
            const samplePath = path.resolve(__dirname, `../../../../../apps/studio/public/${sampleFile}`);
            if (!fs.existsSync(samplePath)) {
                it.skip(`skip: ${sampleFile} does not exist`, () => {
                    expect(true).toBe(true);
                });
                return;
            }
            const sample = fs.readFileSync(samplePath, 'utf8');
            const lines = sample.split(/\r?\n/);
            const eventLines = lines.filter((l) => /^\[.*\]/.test(l)).slice(0, 5);

            for (const line of eventLines) {
                it(`parses line: ${line}`, () => {
                    const md = `## 2025-03-15 @Asia/Tokyo\n\n> ${line}\n`;
                    const tree = unified().use(remarkParse).parse(md);
                    const ran = unified().use(remarkParse).use(remarkItinerary, {}).runSync(tree);
                    const events = toItineraryEvents(ran as unknown as import('mdast').Root);
                    expect(events.length).toBe(1);
                });
            }
        });
    }
});
