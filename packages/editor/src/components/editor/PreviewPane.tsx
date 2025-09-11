import * as Toggle from '@radix-ui/react-toggle';
import { Bug, ChevronsDown } from 'lucide-react';
import type React from 'react';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { MdastView } from '@/components/MdastView';
import { useI18n } from '@/i18n';

export const PreviewPane: React.FC<{
    showMdast: boolean;
    toggleMdast: () => void;
    toggleAutoScroll: () => void;
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
    preferAltNames?: boolean;
    externalContainerRef?: React.MutableRefObject<HTMLDivElement | null>;
    /** Whether to show the auto-scroll toggle button */
    showAutoScrollToggle?: boolean;
    onTimezoneChange?: (timezone: string) => void;
}> = ({
    showMdast,
    toggleMdast,
    toggleAutoScroll,
    previewContent,
    frontmatterTitle,
    frontmatterDescription,
    frontmatterTags,
    timezone,
    currency,
    rate,
    activeLine,
    autoScroll,
    className = '',
    showPast,
    onShowPast,
    preferAltNames,
    externalContainerRef,
    showAutoScrollToggle = true,
    onTimezoneChange,
}) => {
    const { t } = useI18n();
    return (
        <div className={`h-full min-h-0 flex flex-col group ${className}`}>
            <div className="h-8 px-2 py-1 flex items-center justify-between bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600 group/debug">
                <span>{showMdast ? 'MDAST' : 'Preview'}</span>
                <div className="flex items-center gap-1">
                    <Toggle.Root
                        aria-label="Toggle MDAST view"
                        title="Toggle MDAST view"
                        pressed={!!showMdast}
                        onPressedChange={toggleMdast}
                        className={`transition-opacity text-sm opacity-0 group-hover/debug:opacity-100 inline-flex items-center justify-center px-1.5 h-6 ${showMdast ? 'opacity-100 text-red-700' : 'text-gray-600'}`}
                    >
                        <Bug size={12} />
                    </Toggle.Root>
                    {showAutoScrollToggle && (
                        <Toggle.Root
                            pressed={!!autoScroll}
                            onPressedChange={toggleAutoScroll}
                            aria-label={!autoScroll ? t('autoScroll.enable') : t('autoScroll.disable')}
                            title={!autoScroll ? t('autoScroll.enable') : t('autoScroll.disable')}
                            className={`text-sm opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center px-1.5 h-6 rounded border ${autoScroll ? 'text-white bg-gray-700 border-gray-700' : 'text-gray-600 border-gray-300 bg-white hover:bg-gray-50'} ${showMdast ? 'opacity-100' : ''}`}
                        >
                            <ChevronsDown size={12} />
                            <span className="hidden md:inline text-xs ml-1">{t('autoScroll.label', { state: autoScroll ? t('past.on') : t('past.off') })}</span>
                        </Toggle.Root>
                    )}
                </div>
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
                        preferAltNames={preferAltNames}
                        externalContainerRef={externalContainerRef}
                        onTimezoneChange={onTimezoneChange}
                    />
                )}
            </div>
        </div>
    );
};
