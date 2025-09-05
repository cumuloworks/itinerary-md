import { type FC, memo, useCallback, useId, useMemo, useState } from 'react';
import { notifyError, notifySuccess } from '../core/errors';
import { useAutosave } from '../hooks/useAutosave';
import { useHashImport } from '../hooks/useHashImport';
import { useInitialContent } from '../hooks/useInitialContent';
import { useItinerary } from '../hooks/useItinerary';
import { useLatest } from '../hooks/useLatest';
import { useTopbarState } from '../hooks/useTopbarState';
import { writeTextToClipboard } from '../utils/clipboard';
import { COMMON_CURRENCIES } from '../utils/currency';
import { buildShareUrlFromContent } from '../utils/hash';
import { getTimezoneOptions } from '../utils/timezone';
import { ImportDialog } from './dialog/ImportDialog';
import { LoadSampleDialog } from './dialog/LoadSampleDialog';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownPreviewErrorBoundary } from './MarkdownPreviewErrorBoundary';
import { MonacoEditor } from './MonacoEditor';
import { TopBar } from './TopBar';
import '../index.css';

interface EditorProps {
    storageKey?: string;
    samplePath?: string;
}

const STORAGE_KEY_DEFAULT = 'itinerary-md-content';
const AUTOSAVE_DELAY = 1000;
const PREVIEW_DEBOUNCE_DELAY = 300;
const SAMPLE_PATH_DEFAULT = '/sample.md';

const EditorComponent: FC<EditorProps> = ({ storageKey = STORAGE_KEY_DEFAULT, samplePath = SAMPLE_PATH_DEFAULT }) => {
    const [editedLine, setEditedLine] = useState<number | undefined>(undefined);
    const tzSelectId = useId();

    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
    const currencyOptions = COMMON_CURRENCIES;

    const { content, setContent, pendingLoadSample, loadSample, cancelLoadSample, confirmLoadSample } = useInitialContent({
        storageKey,
        samplePath,
    });

    const { saveNow } = useAutosave(content, {
        key: storageKey,
        delay: AUTOSAVE_DELAY,
    });

    const [topbar, updateTopbar] = useTopbarState();

    const { previewContent, frontmatterTitle } = useItinerary(content, PREVIEW_DEBOUNCE_DELAY, {
        timezone: topbar.timezone,
    });

    const latestContent = useLatest(content);

    const handleContentChange = useCallback(
        (newContent: string) => {
            setContent(newContent);
        },
        [setContent]
    );

    const handleShareUrl = useCallback(async () => {
        try {
            const url = buildShareUrlFromContent(latestContent.current);
            await writeTextToClipboard(url);
            notifySuccess('Shareable URL copied to clipboard');
        } catch (error) {
            console.error('Failed to generate URL:', error);
            notifyError('Failed to generate URL');
        }
    }, [latestContent]);

    const handleCopyMarkdown = useCallback(async () => {
        try {
            await writeTextToClipboard(latestContent.current);
            notifySuccess('Markdown copied to clipboard');
        } catch (error) {
            console.error('Copy failed:', error);
            notifyError('Copy failed');
        }
    }, [latestContent]);

    const hashImport = useHashImport(
        (hashContent: string) => setContent(hashContent),
        () => saveNow()
    );

    const containerClass = `flex-1 min-h-0 border border-gray-300 bg-white rounded-none md:rounded-lg overflow-hidden divide-gray-300 ${topbar.viewMode === 'split' ? 'flex flex-col divide-y md:flex-row md:divide-x' : 'flex'}`;

    return (
        <div className="h-full flex flex-col min-h-0 gap-4">
            <ImportDialog open={hashImport.isDialogOpen} onCancel={hashImport.cancelImport} onLoad={hashImport.confirmImport} />
            <LoadSampleDialog open={pendingLoadSample} onCancel={cancelLoadSample} onLoad={confirmLoadSample} />
            <TopBar
                tzSelectId={tzSelectId}
                timezoneOptions={timezoneOptions}
                currencyOptions={currencyOptions}
                topbar={topbar}
                onTopbarChange={updateTopbar}
                onCopyMarkdown={handleCopyMarkdown}
                onShareUrl={handleShareUrl}
                onLoadSample={loadSample}
            />
            <div className={containerClass}>
                {(topbar.viewMode === 'split' || topbar.viewMode === 'editor') && (
                    <div className={`${topbar.viewMode === 'split' ? 'md:basis-1/2 basis-1/3' : 'flex-1'} min-w-0 min-h-0`}>
                        <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">Editor</div>
                        <div className="h-[calc(100%-41px)] min-h-0">
                            <MonacoEditor
                                value={content}
                                onChange={handleContentChange}
                                onSave={saveNow}
                                onCursorLineChange={(ln) => {
                                    if (topbar.autoScroll) setEditedLine(ln);
                                }}
                            />
                        </div>
                    </div>
                )}
                {(topbar.viewMode === 'split' || topbar.viewMode === 'preview') && (
                    <div className={`${topbar.viewMode === 'split' ? 'md:basis-1/2 basis-2/3' : 'flex-1'} min-w-0 min-h-0`}>
                        <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">Preview</div>
                        <div className="h-[calc(100%-41px)] min-h-0">
                            <MarkdownPreviewErrorBoundary>
                                <MarkdownPreview content={previewContent} title={frontmatterTitle} timezone={topbar.timezone} currency={topbar.currency} showPast={topbar.showPast} activeLine={editedLine} autoScroll={topbar.autoScroll} />
                            </MarkdownPreviewErrorBoundary>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Editor = memo(EditorComponent);
