import fs from 'node:fs';
import path from 'node:path';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { toItineraryEvents } from '../extract';
import { remarkItinerary } from '../remark/itinerary';

describe('sample.md パラメトリック', () => {
    const samplePath = path.resolve(__dirname, '../../../../../apps/studio/public/sample.md');
    const sample = fs.readFileSync(samplePath, 'utf8');
    const lines = sample.split(/\r?\n/);
    const eventLines = lines.filter((l) => /^\[.*\]/.test(l)).slice(0, 5);

    for (const line of eventLines) {
        it(`行を解析: ${line}`, () => {
            const md = `## 2025-03-15 @Asia/Tokyo\n\n${line}\n`;
            const tree = unified().use(remarkParse).parse(md);
            const ran = unified().use(remarkParse).use(remarkItinerary, {}).runSync(tree);
            const events = toItineraryEvents(ran as any);
            expect(events.length).toBe(1);
        });
    }
});
