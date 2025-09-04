import { useCallback, useId, useMemo, useState } from 'react';
import { ImportDialog } from './components/dialog/ImportDialog';
import { LoadSampleDialog } from './components/dialog/LoadSampleDialog';
import { Header } from './components/Header';
import { MarkdownPreview } from './components/MarkdownPreview';
import { MarkdownPreviewErrorBoundary } from './components/MarkdownPreviewErrorBoundary';
import { MonacoEditor } from './components/MonacoEditor';
import { TopBar } from './components/TopBar';
import { notifyError, notifySuccess } from './core/errors';
import { useAutosave } from './hooks/useAutosave';
import { useHashImport } from './hooks/useHashImport';
import { useInitialContent } from './hooks/useInitialContent';
import { useItinerary } from './hooks/useItinerary';
import { useLatest } from './hooks/useLatest';
import { useTopbarState } from './hooks/useTopbarState';
import { writeTextToClipboard } from './utils/clipboard';
import { COMMON_CURRENCIES } from './utils/currency';
import { buildShareUrlFromContent } from './utils/hash';
import { getTimezoneOptions } from './utils/timezone';

const STORAGE_KEY = 'itinerary-md-content';
const AUTOSAVE_DELAY = 1000;
const PREVIEW_DEBOUNCE_DELAY = 300;

function App() {
    const tzSelectId = useId();
    const [editedLine, setEditedLine] = useState<number | undefined>(undefined);

    const { content, setContent, pendingLoadSample, loadSample, cancelLoadSample, confirmLoadSample } = useInitialContent({
        storageKey: STORAGE_KEY,
        samplePath: '/sample.md',
    });

    const hashImport = useHashImport(
        (hashContent: string) => setContent(hashContent),
        () => saveNow()
    );

    const { saveNow } = useAutosave(content, {
        key: STORAGE_KEY,
        delay: AUTOSAVE_DELAY,
    });

    const [topbar, updateTopbar] = useTopbarState();

    const { previewContent, frontmatterTitle } = useItinerary(content, PREVIEW_DEBOUNCE_DELAY, {
        timezone: topbar.timezone,
    });

    const previewProps = useMemo(
        () => ({
            timezone: topbar.timezone,
            currency: topbar.currency,
            showPast: topbar.showPast,
            autoScroll: topbar.autoScroll,
        }),
        [topbar.timezone, topbar.currency, topbar.showPast, topbar.autoScroll]
    );

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

    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

    return (
        <div className="max-w-screen-2xl mx-auto h-svh overflow-hidden flex flex-col pt-8 pb-0 md:pb-8">
            <Header />
            <ImportDialog open={hashImport.isDialogOpen} onCancel={hashImport.cancelImport} onLoad={hashImport.confirmImport} />
            <LoadSampleDialog open={pendingLoadSample} onCancel={cancelLoadSample} onLoad={confirmLoadSample} />
            <TopBar
                tzSelectId={tzSelectId}
                timezoneOptions={timezoneOptions}
                currencyOptions={COMMON_CURRENCIES}
                topbar={topbar}
                onTopbarChange={updateTopbar}
                onCopyMarkdown={handleCopyMarkdown}
                onShareUrl={handleShareUrl}
                onLoadSample={loadSample}
            />
            <div className="px-0 md:px-8 w-full flex-1 min-h-0">
                <div className={`mt-4 mb-4 h-full border border-gray-300 bg-white rounded-none md:rounded-lg overflow-hidden divide-gray-300 ${topbar.viewMode === 'split' ? 'flex flex-col divide-y md:flex-row md:divide-x' : 'flex'}`}>
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
                                    <MarkdownPreview content={previewContent} {...previewProps} title={frontmatterTitle} activeLine={editedLine} />
                                </MarkdownPreviewErrorBoundary>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
