import { Bug } from 'lucide-react';
import type React from 'react';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { MdastView } from '@/components/MdastView';

export const PreviewPane: React.FC<{
    showMdast: boolean;
    toggleMdast: () => void;
    previewContent: string;
    frontmatterTitle?: string;
    frontmatterDescription?: string;
    frontmatterTags?: string[];
    timezone?: string;
    currency?: string;
    rate?: { from: string; to: string; value: number };
    activeLine?: number;
    autoScroll?: boolean;
    className?: string;
    showPast?: boolean;
    onShowPast?: () => void;
}> = ({ showMdast, toggleMdast, previewContent, frontmatterTitle, frontmatterDescription, frontmatterTags, timezone, currency, rate, activeLine, autoScroll, className = '', showPast, onShowPast }) => {
    return (
        <div className={`h-full min-h-0 flex flex-col ${className}`}>
            <div className="px-2 py-1 flex justify-between bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600 group">
                <span>{showMdast ? 'MDAST' : 'Preview'}</span>
                <button type="button" className="text-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={toggleMdast}>
                    <Bug size={12} />
                </button>
            </div>
            <div className="h-[calc(100%-41px)] min-h-0">
                {showMdast ? (
                    <MdastView content={previewContent} timezone={timezone} currency={currency} />
                ) : (
                    <MarkdownPreview
                        content={previewContent}
                        title={frontmatterTitle}
                        description={frontmatterDescription}
                        tags={frontmatterTags}
                        timezone={timezone}
                        currency={currency}
                        rate={rate}
                        activeLine={activeLine}
                        autoScroll={autoScroll}
                        showPast={showPast}
                        onShowPast={onShowPast}
                    />
                )}
            </div>
        </div>
    );
};
