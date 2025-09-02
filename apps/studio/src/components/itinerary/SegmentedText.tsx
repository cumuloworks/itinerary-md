import type React from 'react';
import type { TextSegment } from '@itinerary-md/core';
import { isAllowedHref, isExternalHttpUrl } from '../../utils/url';

interface SegmentedTextProps {
    segments?: TextSegment[];
    fallbackText?: string;
    className?: string;
    linkClassName?: string;
}

export const SegmentedText: React.FC<SegmentedTextProps> = ({ segments, fallbackText, className = '', linkClassName = 'underline text-inherit' }) => {
    if (!segments || segments.length === 0) {
        if (!fallbackText) return null;
        return <span className={className}>{fallbackText}</span>;
    }

    // 全セグメントがリンクかチェック
    const allSegmentsAreLinks = segments.every(seg => seg.url && isAllowedHref(seg.url));
    
    if (segments.length === 1) {
        const seg = segments[0];
        if (seg.url && isAllowedHref(seg.url)) {
            const isExternal = isExternalHttpUrl(seg.url);
            // 単一セグメント（全体がリンク）の場合は、text-inheritではなく色クラスを直接適用
            const finalClassName = allSegmentsAreLinks 
                ? `${className} ${linkClassName.replace('text-inherit', '').trim()}` 
                : `${className} ${linkClassName}`;
            return (
                <a 
                    href={seg.url} 
                    target={isExternal ? "_blank" : undefined} 
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={finalClassName}
                >
                    {seg.text}
                </a>
            );
        }
        return <span className={className}>{seg.text}</span>;
    }

    const counts: Record<string, number> = {};
    
    // 全体がリンクの場合は外側のspanを省略
    if (allSegmentsAreLinks) {
        return (
            <>
                {segments.map((seg) => {
                    const base = `${seg.text}|${seg.url ?? ''}`;
                    counts[base] = (counts[base] || 0) + 1;
                    const key = `${base}#${counts[base]}`;

                    if (seg.url && isAllowedHref(seg.url)) {
                        const isExternal = isExternalHttpUrl(seg.url);
                        // 全体がリンクの場合は、色クラスを直接適用
                        const finalClassName = `${className} ${linkClassName.replace('text-inherit', '').trim()}`;
                        return (
                            <a 
                                key={key} 
                                href={seg.url} 
                                target={isExternal ? "_blank" : undefined} 
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                className={finalClassName}
                            >
                                {seg.text}
                            </a>
                        );
                    }
                    return <span key={key} className={className}>{seg.text}</span>;
                })}
            </>
        );
    }
    
    // 一部がリンクの場合は従来通り
    return (
        <span className={className}>
            {segments.map((seg) => {
                const base = `${seg.text}|${seg.url ?? ''}`;
                counts[base] = (counts[base] || 0) + 1;
                const key = `${base}#${counts[base]}`;

                if (seg.url && isAllowedHref(seg.url)) {
                    const isExternal = isExternalHttpUrl(seg.url);
                    return (
                        <a 
                            key={key} 
                            href={seg.url} 
                            target={isExternal ? "_blank" : undefined} 
                            rel={isExternal ? "noopener noreferrer" : undefined}
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
