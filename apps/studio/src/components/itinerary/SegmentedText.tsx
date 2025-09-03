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
    
    const counts: Record<string, number> = {};
    
    // セグメント要素を統一的に作成
    const segmentElements = segments.map((seg) => {
        const base = `${seg.text}|${seg.url ?? ''}`;
        counts[base] = (counts[base] || 0) + 1;
        const key = `${base}#${counts[base]}`;

        if (seg.url && isAllowedHref(seg.url)) {
            const isExternal = isExternalHttpUrl(seg.url);
            // 全体がリンクの場合は色クラスを直接適用、一部がリンクの場合はtext-inheritを使用
            const finalClassName = allSegmentsAreLinks 
                ? `${className} ${linkClassName.replace('text-inherit', '').trim()}`
                : linkClassName;
                
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
        // リンクでないセグメント
        return allSegmentsAreLinks 
            ? <span key={key} className={className}>{seg.text}</span>
            : <span key={key}>{seg.text}</span>;
    });
    
    // 全体がリンクの場合は外側のspanを省略、一部がリンクの場合は外側にspanを追加
    return allSegmentsAreLinks 
        ? <>{segmentElements}</>
        : <span className={className}>{segmentElements}</span>;
};
