import type React from 'react';
import { isAllowedHref } from '../../utils/url';

export type TextSegment = {
    text: string;
    url?: string;
};

interface SegmentedTextProps {
    segments?: TextSegment[];
    fallbackText?: string;
    className?: string;
    linkClassName?: string;
}

export const SegmentedText: React.FC<SegmentedTextProps> = ({ 
    segments, 
    fallbackText, 
    className = '', 
    linkClassName = 'underline text-inherit' 
}) => {
        if (!segments || segments.length === 0) {
        if (!fallbackText) return null;
        return <span className={className}>{fallbackText}</span>;
    }

        if (segments.length === 1) {
        const seg = segments[0];
        if (seg.url && isAllowedHref(seg.url)) {
            return (
                <a 
                    href={seg.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`${className} ${linkClassName}`}
                >
                    {seg.text}
                </a>
            );
        }
        return <span className={className}>{seg.text}</span>;
    }

        const counts: Record<string, number> = {};
    return (
        <span className={className}>
            {segments.map((seg) => {
                                const base = `${seg.text}|${seg.url ?? ''}`;
                counts[base] = (counts[base] || 0) + 1;
                const key = `${base}#${counts[base]}`;
                
                if (seg.url && isAllowedHref(seg.url)) {
                    return (
                        <a 
                            key={key} 
                            href={seg.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={linkClassName}
                        >
                            {seg.text}
                        </a>
                    );
                }
                return <span key={key}>{seg.text}</span>;
            })}
        </span>
    );
};
