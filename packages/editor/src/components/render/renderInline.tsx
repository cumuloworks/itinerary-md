import React from 'react';
import { isAllowedHref } from '../../utils/url';

export const renderInline = (nodes: any[] | undefined): React.ReactNode => {
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
                        {renderInline(n.children)}
                    </em>
                );
            case 'strong':
                return (
                    <strong key={key} className="font-semibold text-gray-900">
                        {renderInline(n.children)}
                    </strong>
                );
            case 'delete':
                return <del key={key}>{renderInline(n.children)}</del>;
            case 'inlineCode':
                return (
                    <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                        {typeof n.value === 'string' ? n.value : ''}
                    </code>
                );
            case 'link': {
                const href = typeof n.url === 'string' ? n.url : undefined;
                if (!href || !isAllowedHref(href)) return renderInline(n.children);
                return (
                    <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline text-inherit">
                        {renderInline(n.children)}
                    </a>
                );
            }
            case 'break':
                return <br key={key} />;
            default:
                if (Array.isArray(n.children)) return <React.Fragment key={key}>{renderInline(n.children)}</React.Fragment>;
                return null;
        }
    };
    nodes.forEach((n, idx) => {
        out.push(walk(n, `in-${idx}`));
    });
    return out;
};
