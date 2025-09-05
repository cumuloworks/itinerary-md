import ColorHash from 'color-hash';

export interface TagsProps {
    tags?: string[];
    className?: string;
}

const colorHash = new ColorHash({ lightness: 0.85, saturation: 0.6 });
const borderHash = new ColorHash({ lightness: 0.75, saturation: 0.5 });
const textColor = '#374151'; // gray-700

function colorForTag(tag: string): { bg: string; border: string; text: string } {
    const base = tag.toLowerCase();
    const bg = colorHash.hsl(base);
    const border = borderHash.hsl(base);
    // color-hash の hsl() は [h, s, l] を返す
    const bgCss = `hsl(${bg[0]} ${Math.round(bg[1] * 100)}% ${Math.round(bg[2] * 100)}%)`;
    const borderCss = `hsl(${border[0]} ${Math.round(border[1] * 100)}% ${Math.round(border[2] * 100)}%)`;
    return { bg: bgCss, border: borderCss, text: textColor };
}

export function Tags({ tags, className }: TagsProps) {
    if (!Array.isArray(tags) || tags.length === 0) return null;
    return (
        <div className={className ? className : 'mt-2'}>
            <ul className="flex flex-wrap gap-2">
                {tags.map((t) => {
                    const c = colorForTag(t);
                    return (
                        <li key={t} className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
                            {t}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default Tags;
