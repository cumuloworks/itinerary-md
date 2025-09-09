import { Link as LinkIcon, Map as MapIcon } from 'lucide-react';
import React from 'react';
import { isAllowedHref, isGoogleMapsSearchUrl } from '@/utils/url';

type InlineRenderOptions = {
    linkClassName?: string;
};

export const renderInline = (nodes: any[] | undefined, options?: InlineRenderOptions): React.ReactNode => {
    if (!nodes || nodes.length === 0) return null;
    const out: React.ReactNode[] = [];
    const walk = (n: any, key: string): React.ReactNode => {
        if (!n) return null;
        switch (n.type) {
            case 'text':
                return n.value as string;
            case 'emphasis':
                return (
                    <em key={key} className="italic text-gray-700">
                        {renderInline(n.children, options)}
                    </em>
                );
            case 'strong':
                return (
                    <strong key={key} className="font-semibold text-gray-900">
                        {renderInline(n.children, options)}
                    </strong>
                );
            case 'delete':
                return <del key={key}>{renderInline(n.children, options)}</del>;
            case 'inlineCode':
                return (
                    <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                        {typeof n.value === 'string' ? n.value : ''}
                    </code>
                );
            case 'link': {
                const href = typeof n.url === 'string' ? n.url : undefined;
                if (!href || !isAllowedHref(href)) return renderInline(n.children, options);
                const isMaps = isGoogleMapsSearchUrl(href);
                return (
                    <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={options?.linkClassName ?? 'no-underline text-inherit'}>
                        <span className="inline-flex items-center gap-1">
                            {renderInline(n.children, options)}
                            {isMaps ? <MapIcon className="inline-block size-4 align-[-2px] opacity-70" /> : <LinkIcon className="inline-block size-4 align-[-2px] opacity-70" />}
                        </span>
                    </a>
                );
            }
            case 'break':
                return <br key={key} />;
            default:
                if (Array.isArray(n.children)) return <React.Fragment key={key}>{renderInline(n.children, options)}</React.Fragment>;
                return null;
        }
    };
    nodes.forEach((n, idx) => {
        out.push(walk(n, `in-${idx}`));
    });
    return out;
};
