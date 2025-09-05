export const getHProps = (n: unknown): { className?: string } & Record<string, unknown> => {
    try {
        const raw = (n as { data?: { hProperties?: Record<string, unknown> } })?.data?.hProperties as Record<string, unknown> | undefined;
        if (!raw) return {} as any;
        const out: Record<string, unknown> = {};
        const cls = raw.className as unknown;
        if (Array.isArray(cls)) {
            const joined = cls
                .filter((v) => typeof v === 'string')
                .join(' ')
                .trim();
            if (joined) out.className = joined;
        } else if (typeof cls === 'string' && cls.trim()) {
            out.className = cls.trim();
        }
        for (const [k, v] of Object.entries(raw)) {
            if (k === 'className') continue;
            out[k] = v;
        }
        return out as any;
    } catch {
        return {} as any;
    }
};

export const mergeClassNames = (...classes: Array<string | undefined>): string => classes.filter((c) => typeof c === 'string' && c.trim()).join(' ');
