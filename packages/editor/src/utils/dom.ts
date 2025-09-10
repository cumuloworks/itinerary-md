export function findBestTargetForLine(container: HTMLElement, line: number): { target: HTMLElement | null; boxTarget: HTMLElement | null } {
    let nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-itin-line-start], [data-itin-line-end]'));
    if (nodes.length === 0) nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-sourcepos]'));
    if (nodes.length === 0) return { target: null, boxTarget: null };

    let best: { el: HTMLElement; score: number } | null = null;
    for (const el of nodes) {
        const ds = el.dataset || {};
        let start = Number(ds.itinLineStart ?? ds.lineStart ?? NaN);
        let end = Number(ds.itinLineEnd ?? ds.lineEnd ?? NaN);
        if ((!Number.isFinite(start) || !Number.isFinite(end)) && typeof ds.sourcepos === 'string') {
            const parts = ds.sourcepos.split('-');
            if (parts.length === 2) {
                const sNum = Number(parts[0].split(':')[0]);
                const eNum = Number(parts[1].split(':')[0]);
                if (Number.isFinite(sNum)) start = sNum;
                if (Number.isFinite(eNum)) end = eNum;
            }
        }
        const hasStart = Number.isFinite(start);
        const hasEnd = Number.isFinite(end);
        let contains = false;
        if (hasStart && hasEnd) contains = start <= line && line <= end;
        else if (hasStart) contains = start === line;
        else if (hasEnd) contains = end === line;
        if (contains) {
            best = { el, score: 0 };
            break;
        }
        if (hasStart && start <= line) {
            const score = line - start;
            if (!best || score < best.score) best = { el, score };
        }
    }

    const target = best?.el ?? null;
    if (!target) return { target: null, boxTarget: null };
    const hasBox = (el: Element) => el.getClientRects().length > 0;
    let boxTarget: HTMLElement | null = hasBox(target) ? target : null;
    if (!boxTarget) {
        for (const el of Array.from(target.querySelectorAll<HTMLElement>('*'))) {
            if (hasBox(el)) {
                boxTarget = el;
                break;
            }
        }
    }
    return { target, boxTarget };
}

export function isElementVisibleWithin(container: HTMLElement, el: HTMLElement, margin = 8): boolean {
    const cRect = container.getBoundingClientRect();
    const tRect = el.getBoundingClientRect();
    return tRect.bottom > cRect.top + margin && tRect.top < cRect.bottom - margin;
}

export function scrollElementIntoCenteredView(container: HTMLElement, el: HTMLElement) {
    const cRect = container.getBoundingClientRect();
    const tRect = el.getBoundingClientRect();
    const delta = tRect.top - cRect.top - container.clientHeight / 2 + tRect.height / 2;
    container.scrollBy({ top: delta, behavior: 'smooth' });
}
