import { ChevronDown, ChevronUp, Clock, Copy, Layout, Link, PanelLeft, PanelRight } from 'lucide-react';
import type React from 'react';

type ViewMode = 'split' | 'editor' | 'preview';
type StayMode = 'default' | 'header';
export type TopbarState = {
    baseTz: string;
    currency: string;
    dashboardVisible: boolean;
    viewMode: ViewMode;
    stayMode: StayMode;
};

interface TopBarProps {
    tzSelectId: string;
    timezoneOptions: string[];
    state: TopbarState;
    onChange: (patch: Partial<TopbarState>) => void;
    onCopyMarkdown: () => void;
    onShareUrl: () => void;
    currencyOptions: string[];
    frontmatterBaseTz?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ tzSelectId, timezoneOptions, state, onChange, onCopyMarkdown, onShareUrl, currencyOptions, frontmatterBaseTz }) => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
            <div className="flex items-center flex-wrap gap-3 md:gap-6">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label htmlFor={tzSelectId} className="text-sm text-gray-600 font-medium whitespace-nowrap">
                        Time zone
                    </label>
                    <select id={tzSelectId} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white shadow-sm w-full md:w-auto md:max-w-[320px]" value={state.baseTz} onChange={(e) => onChange({ baseTz: e.target.value })}>
                        {timezoneOptions.map((tz) => (
                            <option key={tz} value={tz}>
                                {tz}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                            const fm = frontmatterBaseTz;
                            const target = state.baseTz === (fm || browserTz) ? browserTz : fm || browserTz;
                            onChange({ baseTz: target });
                        }}
                        disabled={!frontmatterBaseTz}
                        title={frontmatterBaseTz ? (state.baseTz === frontmatterBaseTz ? `Switch to device TZ (${browserTz})` : `Switch to frontmatter timezone (${frontmatterBaseTz})`) : 'No timezone in frontmatter'}
                    >
                        <Clock size={16} />
                    </button>
                </div>

                <label className="text-sm text-gray-600 font-medium flex items-center gap-3 w-full md:w-auto whitespace-nowrap">
                    <span className="whitespace-nowrap">Currency</span>
                    <select className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white shadow-sm w-full md:w-auto md:max-w-[200px]" value={state.currency} onChange={(e) => onChange({ currency: e.target.value })}>
                        {currencyOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="text-sm text-gray-600 font-medium flex items-center gap-3 w-full md:w-auto whitespace-nowrap">
                    <span className="whitespace-nowrap">Stay display</span>
                    <select className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white shadow-sm w-full md:w-auto md:max-w-[200px]" value={state.stayMode} onChange={(e) => onChange({ stayMode: e.target.value as StayMode })}>
                        <option value="default">Default</option>
                        <option value="header">Header</option>
                    </select>
                </label>

                {/* ビュー切替: すべての画面サイズでボタン表示 */}
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => onChange({ viewMode: 'split' })}
                        className={`px-2 py-1 text-sm border rounded-l ${state.viewMode === 'split' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        title="Side by side"
                        aria-pressed={state.viewMode === 'split'}
                    >
                        <Layout size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ viewMode: 'editor' })}
                        className={`px-2 py-1 text-sm border-t border-b ${state.viewMode === 'editor' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        title="Editor Only"
                        aria-pressed={state.viewMode === 'editor'}
                    >
                        <PanelLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ viewMode: 'preview' })}
                        className={`px-2 py-1 text-sm border rounded-r ${state.viewMode === 'preview' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        title="Preview Only"
                        aria-pressed={state.viewMode === 'preview'}
                    >
                        <PanelRight size={16} />
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={onCopyMarkdown} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors" title="Copy Markdown to clipboard">
                    <Copy size={16} />
                    Copy Markdown
                </button>
                <button type="button" onClick={onShareUrl} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors" title="Compress into URL and copy share link">
                    <Link size={16} />
                    Share via URL
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ dashboardVisible: !state.dashboardVisible })}
                    className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    title={state.dashboardVisible ? 'Collapse dashboard' : 'Expand dashboard'}
                    aria-label="Toggle dashboard"
                >
                    {state.dashboardVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>
        </div>
    );
};

export default TopBar;
