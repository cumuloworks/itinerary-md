// Fonts injection utilities for the editor
export type GoogleFontsConfig = {
    provider: 'google';
    families: string[];
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
};

export type StylesheetFontsConfig = {
    href: string;
};

export type EditorFontsOption = GoogleFontsConfig | StylesheetFontsConfig | false | undefined;

function buildGoogleFontsHref(config: GoogleFontsConfig): string {
    const familiesParam = config.families.map((f) => `family=${encodeURIComponent(f)}`).join('&');
    const displayParam = `display=${encodeURIComponent(config.display ?? 'swap')}`;
    return `https://fonts.googleapis.com/css2?${familiesParam}&${displayParam}`;
}

export function injectFontsLinks(fonts: EditorFontsOption): () => void {
    if (typeof document === 'undefined' || !fonts) return () => {};

    const createdNodes: HTMLElement[] = [];

    const append = (el: HTMLElement) => {
        document.head.appendChild(el);
        createdNodes.push(el);
    };

    const makeLink = (rel: string, href: string) => {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        return link;
    };

    if ((fonts as GoogleFontsConfig).provider === 'google') {
        const cfg = fonts as GoogleFontsConfig;
        const stylesheetHref = buildGoogleFontsHref(cfg);
        const preconnectGstatic = makeLink('preconnect', 'https://fonts.gstatic.com');
        preconnectGstatic.setAttribute('crossorigin', '');
        append(preconnectGstatic);

        const preconnectGoogleapis = makeLink('preconnect', 'https://fonts.googleapis.com');
        append(preconnectGoogleapis);

        const stylesheet = makeLink('stylesheet', stylesheetHref);
        append(stylesheet);
    } else if ((fonts as StylesheetFontsConfig).href) {
        const href = (fonts as StylesheetFontsConfig).href;
        const stylesheet = makeLink('stylesheet', href);
        append(stylesheet);
    }

    return () => {
        for (const node of createdNodes) {
            if (node.parentNode) node.parentNode.removeChild(node);
        }
    };
}
