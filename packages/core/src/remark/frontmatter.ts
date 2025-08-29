import remarkExtractFrontmatter from 'remark-extract-frontmatter';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { VFile } from 'vfile';
import YAML from 'yaml';

export type Frontmatter = Record<string, unknown>;

export async function extractFrontmatter(content: string): Promise<Frontmatter | null> {
    try {
        const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkExtractFrontmatter, { yaml: YAML.parse, name: 'frontmatter' });

        const tree = processor.parse(content);
        const vfile = new VFile({ value: content });
        await processor.run(tree, vfile);
        const data = (vfile.data as Record<string, unknown>) || {};
        const fm = data.frontmatter as unknown;
        if (fm && typeof fm === 'object') return fm as Frontmatter;
        if (typeof fm === 'string') {
            try {
                return YAML.parse(fm) as Frontmatter;
            } catch {
                return null;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export type StayMode = 'default' | 'header';

export type ItineraryFrontmatter = {
    title?: string;
    timezone?: string;
    currency?: string;
    stayMode?: StayMode;
};

export async function parseItineraryFrontmatter(content: string): Promise<ItineraryFrontmatter | null> {
    const fm = await extractFrontmatter(content);
    if (!fm) return null;
    return normalizeItineraryFrontmatter(fm);
}

export function normalizeItineraryFrontmatter(raw: Frontmatter): ItineraryFrontmatter {
    const out: ItineraryFrontmatter = {};
    const v = (key: string) => raw[key];
    const str = (x: unknown) => (typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined);

    out.title = str(v('title')) || str(v('name'));
    out.timezone = str(v('timezone')) || str(v('tz'));
    out.currency = str(v('currency')) || str(v('cur'));
    const stay = (str(v('stayMode')) || str(v('stay')))?.toLowerCase();
    if (stay === 'header' || stay === 'default') out.stayMode = stay;
    return out;
}
