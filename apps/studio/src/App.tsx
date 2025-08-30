import { parseItineraryFrontmatter } from '@itinerary-md/core';
import { analyzeDates } from '@itinerary-md/statistics';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Dashboard } from './components/Dashboard';
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
    dashboardVisible: boolean;
    viewMode: ViewMode;
    stayMode: StayMode;
};

function App() {
    const [content, setContent] = useState('');
    const [frontmatterBaseTz, setFrontmatterBaseTz] = useState<string | undefined>(undefined);
    const [frontmatterTitle, setFrontmatterTitle] = useState<string | undefined>(undefined);
    const [pendingHashContent, setPendingHashContent] = useState<string | null>(null);
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
            dashboardVisible: true,
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
                const dash = sp.get('dash');
                const stay = sp.get('stay') as StayMode | null;
                const patch: Partial<TopbarState> = {};
                if (tz) patch.baseTz = tz;
                if (cur) patch.currency = cur;
                if (view === 'split' || view === 'editor' || view === 'preview') patch.viewMode = view;
                if (dash === '0' || dash === '1') patch.dashboardVisible = dash === '1';
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

    // 通貨・費用計算の副作用は useCostAnalysis に移行

    // 検索パラメータ同期は useSyncTopbarSearch に移行
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

    const timezoneOptions: string[] = getTimezoneOptions();

    return (
        <div className="max-w-screen-2xl mx-auto h-screen overflow-hidden flex flex-col p-8">
            <h1 className="text-4xl leading-tight mb-2 text-blue-600">Itinerary MD Studio</h1>
            <TopBar
                tzSelectId={tzSelectId}
                timezoneOptions={timezoneOptions}
                state={topbar}
                onChange={handleTopbarChange}
                onCopyMarkdown={handleCopyMarkdown}
                onShareUrl={handleShareUrl}
                currencyOptions={COMMON_CURRENCIES}
                frontmatterBaseTz={frontmatterBaseTz}
            />
            {pendingHashContent !== null && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
                        <h2 className="text-lg font-semibold mb-3">Load content from the shared URL?</h2>
                        <p className="text-sm text-gray-600 mb-4">The current content will be overwritten. Select "Load" to proceed.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                    setPendingHashContent(null);

                                    clearHash();
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => {
                                    if (pendingHashContent !== null) {
                                        setContent(pendingHashContent);
                                        saveNow();
                                    }
                                    setPendingHashContent(null);
                                    clearHash();
                                    notifySuccess('Loaded content from the shared URL');
                                }}
                            >
                                Load
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {topbar.dashboardVisible && (
                <div className="mt-4">
                    <Dashboard summary={summary} totalFormatted={totalFormatted} breakdownFormatted={breakdownFormatted} loading={loading} />
                </div>
            )}
            <div className="mt-4 flex-1 min-h-0 bg-white rounded-xl shadow-md overflow-hidden">
                <div className={`h-full border border-gray-300 rounded-lg overflow-hidden ${topbar.viewMode === 'split' ? 'flex flex-col md:flex-row' : 'flex'}`}>
                    {(topbar.viewMode === 'split' || topbar.viewMode === 'editor') && (
                        <div className={`${topbar.viewMode === 'split' ? 'flex-1' : 'flex-1'} min-w-0 min-h-0`}>
                            <div className="px-4 py-2 bg-gray-100 border-b border-gray-300 font-bold text-sm text-gray-600">Editor</div>
                            <div className="h-[calc(100%-41px)] min-h-0">
                                <MonacoEditor value={content} onChange={handleContentChange} onSave={saveNow} />
                            </div>
                        </div>
                    )}

                    {topbar.viewMode === 'split' && <div className="w-px bg-gray-300 flex-shrink-0 md:block hidden" />}
                    {topbar.viewMode === 'split' && <div className="h-px bg-gray-300 flex-shrink-0 md:hidden block" />}

                    {(topbar.viewMode === 'split' || topbar.viewMode === 'preview') && (
                        <div className={`${topbar.viewMode === 'split' ? 'flex-1' : 'flex-1'} min-w-0 min-h-0`}>
                            <div className="px-4 py-2 bg-gray-100 border-b border-gray-300 font-bold text-sm text-gray-600">Preview</div>
                            <div className="h-[calc(100%-41px)] min-h-0">
                                <MarkdownPreview content={content} baseTz={topbar.baseTz} currency={topbar.currency} stayMode={topbar.stayMode} title={frontmatterTitle} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
                <p>
                    The cost calculation and currency conversion in this app are for reference only. Accuracy and timeliness are not guaranteed. Exchange rates are provided by
                    <a href="https://open.er-api.com" className="underline ml-1" target="_blank" rel="noreferrer">
                        open.er-api.com
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}

export default App;
