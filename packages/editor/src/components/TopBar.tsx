import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Toolbar from '@radix-ui/react-toolbar';
import { Check, ChevronDown, ChevronsDown, Clipboard, Columns, Eye, EyeOff, FileText, MoreHorizontal, PanelBottom, PanelLeft, PanelRight, PanelTop, RotateCcw, Rows, Share2, Trash2 } from 'lucide-react';
import * as React from 'react';
import type { TopbarState, ViewMode } from '../types/itinerary';

interface TopBarProps {
    tzSelectId: string;
    timezoneOptions: string[];
    currencyOptions: string[];
    topbar: TopbarState;
    onTopbarChange: (patch: Partial<TopbarState>) => void;
    onCopyMarkdown: () => void;
    onShareUrl: () => void;
    onLoadSample: () => void;
    onClearAll: () => void;
    className?: string;
}

const TopBarComponent: React.FC<TopBarProps> = ({ tzSelectId, timezoneOptions, currencyOptions, topbar, onTopbarChange, onCopyMarkdown, onShareUrl, onLoadSample, onClearAll, className }) => {
    const tzLabelId = React.useId();
    const currencyLabelId = React.useId();
    const timezoneItems = React.useMemo(() => {
        const now = new Date();
        const toOffsetInfo = (tz: string) => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'shortOffset',
                }).formatToParts(now);
                const tzNamePart = parts.find((p) => p.type === 'timeZoneName');
                const raw = tzNamePart?.value || '';
                // Expect formats like "GMT+9", "GMT+09:00"
                let offsetMinutes = 0;
                const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
                if (match) {
                    const sign = match[1] === '-' ? -1 : 1;
                    const hours = parseInt(match[2], 10);
                    const mins = match[3] ? parseInt(match[3], 10) : 0;
                    offsetMinutes = sign * (hours * 60 + mins);
                }
                const hoursAbs = Math.floor(Math.abs(offsetMinutes) / 60)
                    .toString()
                    .padStart(2, '0');
                const minsAbs = (Math.abs(offsetMinutes) % 60).toString().padStart(2, '0');
                const signStr = offsetMinutes >= 0 ? '+' : '-';
                const offsetLabel = `GMT${signStr}${hoursAbs}${minsAbs !== '00' ? `:${minsAbs}` : ''}`;
                return { tz, offsetMinutes, offsetLabel, label: `${tz} (${offsetLabel})` };
            } catch {
                return { tz, offsetMinutes: 0, offsetLabel: 'GMT+00', label: `${tz} (GMT+00)` };
            }
        };
        return timezoneOptions.map(toOffsetInfo).sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.tz.localeCompare(b.tz));
    }, [timezoneOptions]);

    return (
        <div className="w-full">
            <Toolbar.Root
                className={`w-full scrollbar-none inline-flex h-9 items-center gap-2 md:rounded-lg rounded-none border border-gray-300 bg-white/90 backdrop-blur pl-2 pr-1 py-1 whitespace-nowrap overflow-x-auto ${className || ''}`}
                aria-label="Itinerary controls"
            >
                {/* Timezone */}
                <div className="flex items-center gap-2 h-full">
                    <span id={tzLabelId} className="text-xs text-gray-600 whitespace-nowrap">
                        <span aria-hidden>TZ</span>
                        <span className="sr-only">Timezone</span>
                    </span>
                    <Select.Root value={topbar.timezone} onValueChange={(v) => onTopbarChange({ timezone: v })}>
                        <Select.Trigger id={tzSelectId} aria-labelledby={tzLabelId} className="inline-flex items-center justify-between gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white max-w-[260px] h-full">
                            <Select.Value />
                            <Select.Icon>
                                <ChevronDown size={12} />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content position="popper" sideOffset={4} className="z-50 overflow-auto rounded-md border border-gray-200 bg-white ">
                                <Select.Viewport className="p-1 max-h-[240px] min-w-[var(--radix-select-trigger-width)] w-max max-w-[90vw]">
                                    {timezoneItems.map((item) => (
                                        <Select.Item
                                            key={item.tz}
                                            value={item.tz}
                                            className="relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs text-gray-800 whitespace-nowrap outline-none data-[highlighted]:bg-gray-100"
                                        >
                                            <Select.ItemText>{item.label}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-2 inline-flex items-center">
                                                <Check size={12} />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                    <Toolbar.Button
                        type="button"
                        aria-label="Reset to device timezone"
                        title="Reset to device timezone"
                        onClick={() => {
                            const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                            if (deviceTz) onTopbarChange({ timezone: deviceTz });
                        }}
                        className="inline-flex items-center justify-center px-2 h-full rounded-md border text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
                    >
                        <RotateCcw size={14} />
                        <span className="hidden md:block text-xs ml-1">Device TZ</span>
                    </Toolbar.Button>
                </div>

                {/* Currency */}
                <div className="flex items-center gap-2 h-full">
                    <span id={currencyLabelId} className="text-xs text-gray-600 whitespace-nowrap">
                        <span aria-hidden>Cur</span>
                        <span className="sr-only">Currency</span>
                    </span>
                    <Select.Root value={topbar.currency} onValueChange={(v) => onTopbarChange({ currency: v })}>
                        <Select.Trigger aria-labelledby={currencyLabelId} className="inline-flex items-center justify-between gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white max-w-[140px] h-full">
                            <Select.Value />
                            <Select.Icon>
                                <ChevronDown size={12} />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content position="popper" sideOffset={4} className="z-50 overflow-auto rounded-md border border-gray-200 bg-white ">
                                <Select.Viewport className="p-1 max-h-[240px] min-w-[var(--radix-select-trigger-width)] w-max max-w-[90vw]">
                                    {currencyOptions.map((c) => (
                                        <Select.Item
                                            key={c}
                                            value={c}
                                            className="relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs text-gray-800 whitespace-nowrap outline-none data-[highlighted]:bg-gray-100"
                                        >
                                            <Select.ItemText>{c}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-2 inline-flex items-center">
                                                <Check size={12} />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>

                {/* View mode */}
                <ToggleGroup.Root
                    type="single"
                    value={topbar.viewMode}
                    onValueChange={(v) => v && onTopbarChange({ viewMode: v as ViewMode })}
                    aria-label="View mode"
                    className="inline-flex flex-shrink-0 rounded-md divide-x h-full border divide-gray-300 border-gray-300 overflow-hidden"
                >
                    <ToggleGroup.Item value="editor" aria-label="Editor only" className={`px-2 py-1 text-xs ${topbar.viewMode === 'editor' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <PanelBottom size={14} className="md:hidden" />
                        <PanelRight size={14} className="hidden md:block" />
                    </ToggleGroup.Item>
                    <ToggleGroup.Item value="split" aria-label="Side by side" className={`px-2 py-1 text-xs ${topbar.viewMode === 'split' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <Rows size={14} className="md:hidden" />
                        <Columns size={14} className="hidden md:block" />
                    </ToggleGroup.Item>
                    <ToggleGroup.Item value="preview" aria-label="Preview only" className={`px-2 py-1 text-xs ${topbar.viewMode === 'preview' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <PanelTop size={14} className="md:hidden" />
                        <PanelLeft size={14} className="hidden md:block" />
                    </ToggleGroup.Item>
                </ToggleGroup.Root>

                <Toolbar.Button
                    type="button"
                    aria-label={!topbar.showPast ? 'Show past days' : 'Hide past days'}
                    title={!topbar.showPast ? 'Show past days' : 'Hide past days'}
                    onClick={() => onTopbarChange({ showPast: !topbar.showPast })}
                    className={`inline-flex items-center justify-center px-2 h-full rounded-md border ${!topbar.showPast ? 'text-white bg-gray-700 border-gray-700' : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'}`}
                >
                    {!topbar.showPast ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span className="hidden md:block text-xs ml-1">{!topbar.showPast ? 'Hide Past: ON' : 'Hide Past: OFF'}</span>
                </Toolbar.Button>

                <Toolbar.Button
                    type="button"
                    aria-label={!topbar.autoScroll ? 'Enable auto scroll' : 'Disable auto scroll'}
                    title={!topbar.autoScroll ? 'Enable auto scroll' : 'Disable auto scroll'}
                    onClick={() => onTopbarChange({ autoScroll: !topbar.autoScroll })}
                    className={`inline-flex items-center justify-center px-2 h-full rounded-md border ${topbar.autoScroll ? 'text-white bg-gray-700 border-gray-700' : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'}`}
                >
                    <ChevronsDown size={14} />
                    <span className="text-xs ml-1">Auto Scroll: {topbar.autoScroll ? 'ON' : 'OFF'}</span>
                </Toolbar.Button>

                <Toolbar.Separator className="w-px mr-auto" />

                {/* Actions */}
                <Toolbar.Button
                    type="button"
                    aria-label="Copy Markdown"
                    title="Copy Markdown"
                    onClick={onCopyMarkdown}
                    className="inline-flex items-center justify-center px-2 h-full text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                >
                    <Clipboard size={14} />
                    <span className="hidden md:block text-xs ml-1">Copy Markdown</span>
                </Toolbar.Button>
                <Toolbar.Button
                    type="button"
                    aria-label="Share via URL"
                    title="Share via URL"
                    onClick={onShareUrl}
                    className="inline-flex items-center justify-center px-2 h-full text-white rounded-md bg-teal-600 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                >
                    <Share2 size={14} />
                    <span className="hidden md:block text-xs ml-1">Share via URL</span>
                </Toolbar.Button>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Toolbar.Button type="button" title="More options" className="inline-flex items-center justify-center aspect-square size-9 text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 h-full">
                            <MoreHorizontal size={14} />
                        </Toolbar.Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[160px] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-md">
                            <DropdownMenu.Item onClick={onLoadSample} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-gray-100">
                                <FileText size={16} className="mr-2" />
                                Load Sample
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={onClearAll} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-gray-100 text-red-600">
                                <Trash2 size={16} className="mr-2" />
                                Clear All Contents
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </Toolbar.Root>
        </div>
    );
};

export const TopBar = React.memo(TopBarComponent);
export default TopBar;
