import { parseItineraryFrontmatter } from '@itinerary-md/core';
import { analyzeDates } from '@itinerary-md/statistics';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImportDialog } from './components/dialog/ImportDialog';
import { LoadSampleDialog } from './components/dialog/LoadSampleDialog';
import { Header } from './components/Header';
import { MarkdownPreview } from './components/MarkdownPreview';
import { MonacoEditor } from './components/MonacoEditor';
import { TopBar } from './components/TopBar';
import { notifyError, notifySuccess, safeLocalStorage } from './core/errors';
import { useCostAnalysis } from './hooks/useCostAnalysis';
import { useSyncTopbarSearch } from './hooks/useSyncTopbarSearch';
import { writeTextToClipboard } from './utils/clipboard';
import { COMMON_CURRENCIES } from './utils/currency';
import { buildShareUrlFromContent, clearHash, decodeFromHashBase64, readHashPayload } from './utils/hash';
import { getTimezoneOptions } from './utils/timezone';

const STORAGE_KEY = 'itinerary-md-content';
const AUTOSAVE_DELAY = 1000;
const CURRENCY_STORAGE_KEY = 'itinerary-md-currency';

type ViewMode = 'split' | 'editor' | 'preview';
type StayMode = 'default' | 'header';
type TopbarState = {
    baseTz: string;
    currency: string;
    viewMode: ViewMode;
    stayMode: StayMode;
};

function App() {
    const [content, setContent] = useState('');
    const [frontmatterBaseTz, setFrontmatterBaseTz] = useState<string | undefined>(undefined);
    const [frontmatterTitle, setFrontmatterTitle] = useState<string | undefined>(undefined);
    const [pendingHashContent, setPendingHashContent] = useState<string | null>(null);
    const [pendingLoadSample, setPendingLoadSample] = useState(false);
    const [topbar, setTopbar] = useState<TopbarState>(() => {
        let initialStay: StayMode = 'default';
        try {
            const sp = new URLSearchParams(window.location.search);
            const stay = sp.get('stay') as StayMode | null;
            if (stay === 'default' || stay === 'header') initialStay = stay;
        } catch {}
        return {
            baseTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            currency: localStorage.getItem(CURRENCY_STORAGE_KEY) || 'JPY',
            viewMode: 'split',
            stayMode: initialStay,
        };
    });
    const autosaveTimeoutRef = useRef<number | null>(null);
    const tzSelectId = useId();

    const { loading, totalFormatted, breakdownFormatted } = useCostAnalysis(content, topbar.currency);
    const summary = useMemo(() => analyzeDates(content), [content]);

    useEffect(() => {
        const initializeContent = async () => {
            try {
                const sp = new URLSearchParams(window.location.search);
                const tz = sp.get('tz');
                const cur = sp.get('cur');
                const view = sp.get('view') as ViewMode | null;
                const stay = sp.get('stay') as StayMode | null;
                const patch: Partial<TopbarState> = {};
                if (tz) patch.baseTz = tz;
                if (cur) patch.currency = cur;
                if (view === 'split' || view === 'editor' || view === 'preview') patch.viewMode = view;
                if (stay === 'default' || stay === 'header') patch.stayMode = stay;
                if (Object.keys(patch).length) setTopbar((s) => ({ ...s, ...patch }));
            } catch {}

            const raw = readHashPayload();
            if (raw) {
                const decoded = decodeFromHashBase64(raw);
                if (decoded !== null) setPendingHashContent(decoded);
            }

            const savedContent = safeLocalStorage.get(STORAGE_KEY);
            if (savedContent && savedContent.trim() !== '') {
                setContent(savedContent);
            } else {
                try {
                    const response = await fetch('/sample.md');
                    if (response.ok) {
                        const text = await response.text();
                        setContent(text);
                    }
                } catch {
                    notifyError('Failed to load sample.md');
                }
            }
        };
        initializeContent();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const fm = await parseItineraryFrontmatter(content);
            if (cancelled) return;
            setFrontmatterBaseTz(fm?.timezone);
            setFrontmatterTitle(fm?.title);
        })();
        return () => {
            cancelled = true;
        };
    }, [content]);

    useSyncTopbarSearch(topbar);

    useEffect(() => {
        safeLocalStorage.set(CURRENCY_STORAGE_KEY, topbar.currency);
    }, [topbar.currency]);

    useEffect(() => {
        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }
        const timeoutId = window.setTimeout(() => {
            const ok = safeLocalStorage.set(STORAGE_KEY, content);
            if (ok) {
                notifySuccess('Saved');
            } else {
                notifyError('Failed to save');
            }
            autosaveTimeoutRef.current = null;
        }, AUTOSAVE_DELAY);
        autosaveTimeoutRef.current = timeoutId;

        return () => {
            clearTimeout(timeoutId);
        };
    }, [content]);

    const saveNow = useCallback(() => {
        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
            autosaveTimeoutRef.current = null;
        }
        const ok = safeLocalStorage.set(STORAGE_KEY, content);
        if (ok) {
            notifySuccess('Saved');
        } else {
            notifyError('Failed to save');
        }
    }, [content]);

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
    };

    const handleTopbarChange = useCallback((patch: Partial<TopbarState>) => {
        setTopbar((s) => ({ ...s, ...patch }));
    }, []);

    const handleShareUrl = async () => {
        try {
            const url = buildShareUrlFromContent(content);
            await writeTextToClipboard(url);
            notifySuccess('Shareable URL copied to clipboard');
        } catch (error) {
            console.error('Failed to generate URL:', error);
            notifyError('Failed to generate URL');
        }
    };

    const handleCopyMarkdown = async () => {
        try {
            await writeTextToClipboard(content);
            notifySuccess('Markdown copied to clipboard');
        } catch (error) {
            console.error('Copy failed:', error);
            notifyError('Copy failed');
        }
    };

    const handleLoadSample = () => {
        setPendingLoadSample(true);
    };

    const handleLoadSampleConfirm = async () => {
        try {
            const response = await fetch('/sample.md');
            if (response.ok) {
                const text = await response.text();
                setContent(text);
                saveNow();
                notifySuccess('Sample itinerary loaded');
            } else {
                notifyError('Failed to load sample.md');
            }
        } catch (error) {
            console.error('Failed to load sample:', error);
            notifyError('Failed to load sample.md');
        }
        setPendingLoadSample(false);
    };

    const timezoneOptions: string[] = getTimezoneOptions();

    return (
        <div className="max-w-screen-2xl mx-auto h-screen overflow-hidden flex flex-col pt-8 pb-0 md:pb-8">
            <Header />
            <ImportDialog
                open={pendingHashContent !== null}
                onCancel={() => {
                    setPendingHashContent(null);
                    clearHash();
                }}
                onLoad={() => {
                    if (pendingHashContent !== null) {
                        setContent(pendingHashContent);
                        saveNow();
                    }
                    setPendingHashContent(null);
                    clearHash();
                    notifySuccess('Loaded content from the shared URL');
                }}
            />
            <LoadSampleDialog open={pendingLoadSample} onCancel={() => setPendingLoadSample(false)} onLoad={handleLoadSampleConfirm} />
            <TopBar
                tzSelectId={tzSelectId}
                timezoneOptions={timezoneOptions}
                currencyOptions={COMMON_CURRENCIES}
                topbar={topbar}
                onTopbarChange={handleTopbarChange}
                onCopyMarkdown={handleCopyMarkdown}
                onShareUrl={handleShareUrl}
                onLoadSample={handleLoadSample}
                frontmatterBaseTz={frontmatterBaseTz}
            />
            <div className="px-0 md:px-8 w-full flex-1 min-h-0">
                <div className={`mt-4 mb-4 h-full border border-gray-300 bg-white rounded-none md:rounded-lg overflow-hidden divide-gray-300 ${topbar.viewMode === 'split' ? 'flex flex-col divide-y md:flex-row md:divide-x' : 'flex'}`}>
                    {(topbar.viewMode === 'split' || topbar.viewMode === 'editor') && (
                        <div className={`${topbar.viewMode === 'split' ? 'md:basis-1/2 basis-1/3' : 'flex-1'} min-w-0 min-h-0`}>
                            <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">Editor</div>
                            <div className="h-[calc(100%-41px)] min-h-0">
                                <MonacoEditor value={content} onChange={handleContentChange} onSave={saveNow} />
                            </div>
                        </div>
                    )}
                    {(topbar.viewMode === 'split' || topbar.viewMode === 'preview') && (
                        <div className={`${topbar.viewMode === 'split' ? 'md:basis-1/2 basis-2/3' : 'flex-1'} min-w-0 min-h-0`}>
                            <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">Preview</div>
                            <div className="h-[calc(100%-41px)] min-h-0">
                                <MarkdownPreview
                                    content={content}
                                    baseTz={topbar.baseTz}
                                    currency={topbar.currency}
                                    stayMode={topbar.stayMode}
                                    title={frontmatterTitle}
                                    summary={summary}
                                    totalFormatted={totalFormatted}
                                    breakdownFormatted={breakdownFormatted}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
