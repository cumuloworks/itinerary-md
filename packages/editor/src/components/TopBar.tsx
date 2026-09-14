import {
  Combobox,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxProvider,
} from '@ariakit/react';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Clipboard,
  Columns2,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  FileText,
  Globe,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Printer,
  RotateCcw,
  Rows2,
  Share2,
  Trash2,
} from 'lucide-react';
import { DropdownMenu, Popover, Select, ToggleGroup, Toolbar } from 'radix-ui';
import * as React from 'react';

import { useI18n } from '@/i18n';
import type { TopbarState, ViewMode } from '@/types/itinerary';

interface TopBarProps {
  tzSelectId: string;
  timezoneOptions: string[];
  currencyOptions: string[];
  topbar: TopbarState;
  onTopbarChange: (patch: Partial<TopbarState>) => void;
  onCopyMarkdown: () => void;
  onShareUrl: () => void;
  onDownloadMarkdown?: () => void;
  onPrint?: () => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  className?: string;
}

const TopBarComponent: React.FC<TopBarProps> = ({
  tzSelectId,
  timezoneOptions,
  currencyOptions,
  topbar,
  onTopbarChange,
  onCopyMarkdown,
  onShareUrl,
  onDownloadMarkdown,
  onPrint,
  onLoadSample,
  onClearAll,
  className,
}) => {
  const tzLabelId = React.useId();
  const currencyLabelId = React.useId();
  const { t, lang, setLanguage } = useI18n();
  const [tzQuery, setTzQuery] = React.useState('');
  const [tzOpen, setTzOpen] = React.useState(false);
  const tzInputRef = React.useRef<HTMLInputElement>(null);
  const tzListRef = React.useRef<HTMLDivElement>(null);
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
        const minsAbs = (Math.abs(offsetMinutes) % 60)
          .toString()
          .padStart(2, '0');
        const signStr = offsetMinutes >= 0 ? '+' : '-';
        const offsetLabel = `GMT${signStr}${hoursAbs}:${minsAbs}`;
        return {
          tz,
          offsetMinutes,
          offsetLabel,
          label: `${tz} (${offsetLabel})`,
        };
      } catch {
        return {
          tz,
          offsetMinutes: 0,
          offsetLabel: 'GMT+00:00',
          label: `${tz} (GMT+00:00)`,
        };
      }
    };
    return timezoneOptions
      .map(toOffsetInfo)
      .sort(
        (a, b) => a.offsetMinutes - b.offsetMinutes || a.tz.localeCompare(b.tz)
      );
  }, [timezoneOptions]);
  const filteredTimezoneItems = React.useMemo(() => {
    if (!tzQuery) return timezoneItems;
    const q = tzQuery.toLowerCase();
    return timezoneItems.filter(
      (item) =>
        item.tz.toLowerCase().includes(q) ||
        item.offsetLabel.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q)
    );
  }, [timezoneItems, tzQuery]);

  const selectedTimezoneLabel = React.useMemo(() => {
    const found = timezoneItems.find((i) => i.tz === topbar.timezone);
    return found ? found.label : topbar.timezone;
  }, [timezoneItems, topbar.timezone]);

  React.useEffect(() => {
    if (tzOpen) {
      tzInputRef.current?.focus();
    }
  }, [tzOpen]);

  return (
    <div className="w-full">
      <Toolbar.Root
        className={`inline-flex h-9 w-full scrollbar-none items-center gap-2 overflow-x-auto rounded-none border border-gray-300 bg-white/90 py-1 pr-1 pl-2 whitespace-nowrap backdrop-blur md:rounded-lg ${className || ''}`}
        aria-label={t('toolbar.ariaLabel')}
      >
        {/* Timezone */}
        <div className="flex h-full items-center gap-2">
          <span
            id={tzLabelId}
            className="text-xs whitespace-nowrap text-gray-600"
          >
            <span aria-hidden>{t('timezone.labelShort')}</span>
            <span className="sr-only">{t('timezone.labelSr')}</span>
          </span>
          <Popover.Root
            open={tzOpen}
            onOpenChange={(open) => {
              setTzOpen(open);
              if (!open) setTzQuery('');
            }}
          >
            <ComboboxProvider
              open={tzOpen}
              setOpen={setTzOpen}
              value={tzQuery}
              setValue={setTzQuery}
            >
              <ComboboxLabel className="sr-only">Timezone</ComboboxLabel>
              <Popover.Anchor asChild>
                <Combobox
                  ref={tzInputRef}
                  id={tzSelectId}
                  aria-labelledby={tzLabelId}
                  placeholder={
                    lang === 'ja' ? 'タイムゾーンを検索' : 'Search timezones'
                  }
                  value={tzOpen ? tzQuery : selectedTimezoneLabel}
                  onChange={(e) => setTzQuery(e.target.value)}
                  onMouseDown={() => setTzQuery('')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      let nextTz: string | undefined;
                      const activeEl = tzListRef.current?.querySelector(
                        '[data-active-item]'
                      ) as HTMLElement | null;
                      const activeTz =
                        activeEl?.getAttribute('data-tz') || undefined;
                      if (activeTz) {
                        nextTz = activeTz;
                      } else if (filteredTimezoneItems.length > 0) {
                        nextTz = filteredTimezoneItems[0].tz;
                      }
                      if (nextTz) {
                        onTopbarChange({ timezone: nextTz });
                        setTzOpen(false);
                        setTzQuery('');
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setTzOpen(false);
                      setTzQuery('');
                    }
                  }}
                  onFocus={() => setTzOpen(true)}
                  className="inline-flex h-full w-[260px] max-w-[260px] items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                />
              </Popover.Anchor>
              <Popover.Portal>
                <Popover.Content
                  asChild
                  sideOffset={4}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onInteractOutside={(event) => {
                    const target = event.target as Element | null;
                    const isCombobox = target === tzInputRef.current;
                    const inListbox =
                      target && tzListRef.current?.contains(target);
                    if (isCombobox || inListbox) {
                      event.preventDefault();
                    }
                  }}
                >
                  <ComboboxList
                    ref={tzListRef}
                    className="z-50 max-h-[240px] w-[min(90vw,320px)] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-md"
                  >
                    {filteredTimezoneItems.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-gray-500">
                        {lang === 'ja' ? '該当なし' : 'No results'}
                      </div>
                    ) : (
                      filteredTimezoneItems.map((item) => (
                        <ComboboxItem
                          key={item.tz}
                          value={item.label}
                          focusOnHover
                          data-tz={item.tz}
                          className="relative flex w-full items-center rounded px-2 py-1.5 text-xs whitespace-nowrap text-gray-800 hover:bg-gray-50 data-[active-item]:bg-gray-100"
                          onClick={() => {
                            onTopbarChange({ timezone: item.tz });
                            setTzOpen(false);
                            setTzQuery('');
                          }}
                        >
                          <span className="truncate pr-6">{item.label}</span>
                          {topbar.timezone === item.tz && (
                            <Check size={12} className="absolute right-2" />
                          )}
                        </ComboboxItem>
                      ))
                    )}
                  </ComboboxList>
                </Popover.Content>
              </Popover.Portal>
            </ComboboxProvider>
          </Popover.Root>
          <Toolbar.Button
            type="button"
            aria-label={t('timezone.resetTitle')}
            title={t('timezone.resetTitle')}
            onClick={() => {
              const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (deviceTz) onTopbarChange({ timezone: deviceTz });
            }}
            className="inline-flex h-full items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw size={14} />
            <span className="ml-1 hidden text-xs md:block">
              {t('timezone.reset')}
            </span>
          </Toolbar.Button>
        </div>

        {/* Currency */}
        <div className="flex h-full items-center gap-2">
          <span
            id={currencyLabelId}
            className="text-xs whitespace-nowrap text-gray-600"
          >
            <span aria-hidden>{t('currency.labelShort')}</span>
            <span className="sr-only">{t('currency.labelSr')}</span>
          </span>
          <Select.Root
            value={topbar.currency}
            onValueChange={(v) => onTopbarChange({ currency: v })}
          >
            <Select.Trigger
              aria-labelledby={currencyLabelId}
              className="inline-flex h-full max-w-[140px] items-center justify-between gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={12} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={4}
                className="z-50 overflow-auto rounded-md border border-gray-200 bg-white"
              >
                <Select.Viewport className="max-h-[240px] w-max max-w-[90vw] min-w-[var(--radix-select-trigger-width)] p-1">
                  {currencyOptions.map((c) => (
                    <Select.Item
                      key={c}
                      value={c}
                      className="relative flex cursor-pointer items-center rounded px-2 py-1.5 text-xs whitespace-nowrap text-gray-800 outline-none select-none data-[highlighted]:bg-gray-100"
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
          onValueChange={(v) =>
            v && onTopbarChange({ viewMode: v as ViewMode })
          }
          aria-label={t('viewMode.ariaLabel')}
          className="inline-flex h-full flex-shrink-0 divide-x divide-gray-300 overflow-hidden rounded-md border border-gray-300"
        >
          <ToggleGroup.Item
            value="editor"
            aria-label={t('viewMode.editor')}
            className={`px-2 py-1 text-xs ${topbar.viewMode === 'editor' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <PanelBottom size={14} className="md:hidden" />
            <PanelRight size={14} className="hidden md:block" />
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="split"
            aria-label={t('viewMode.split')}
            className={`px-2 py-1 text-xs ${topbar.viewMode === 'split' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <Rows2 size={14} className="md:hidden" />
            <Columns2 size={14} className="hidden md:block" />
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="preview"
            aria-label={t('viewMode.preview')}
            className={`px-2 py-1 text-xs ${topbar.viewMode === 'preview' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <PanelTop size={14} className="md:hidden" />
            <PanelLeft size={14} className="hidden md:block" />
          </ToggleGroup.Item>
        </ToggleGroup.Root>

        {/* MDAST toggle is implemented in the Editor header */}

        <Toolbar.Button
          type="button"
          aria-label={!topbar.showPast ? t('past.show') : t('past.hide')}
          title={!topbar.showPast ? t('past.show') : t('past.hide')}
          onClick={() => onTopbarChange({ showPast: !topbar.showPast })}
          className={`inline-flex h-full items-center justify-center rounded-md border px-2 ${!topbar.showPast ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {!topbar.showPast ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="ml-1 hidden text-xs md:block">
            {t('past.label', {
              state: !topbar.showPast ? t('past.on') : t('past.off'),
            })}
          </span>
        </Toolbar.Button>

        {/** Auto scroll toggle moved to PreviewPane header */}

        <Toolbar.Button
          type="button"
          aria-label={topbar.altNames ? t('names.hide') : t('names.show')}
          title={topbar.altNames ? t('names.hide') : t('names.show')}
          onClick={() => onTopbarChange({ altNames: !topbar.altNames })}
          className={`inline-flex h-full items-center justify-center rounded-md border px-2 ${topbar.altNames ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <ArrowLeftRight size={14} />
          <span className="ml-1 hidden text-xs md:block">
            {t('names.label', {
              state: topbar.altNames ? t('past.on') : t('past.off'),
            })}
          </span>
        </Toolbar.Button>

        <Toolbar.Separator className="mr-auto w-px" />

        {/* Actions */}
        <Toolbar.Button
          type="button"
          aria-label={t('actions.copy')}
          title={t('actions.copy')}
          onClick={onCopyMarkdown}
          className="inline-flex h-full items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white focus-visible:outline-none"
        >
          <Clipboard size={14} />
          <span className="ml-1 hidden text-xs md:block">
            {t('actions.copy')}
          </span>
        </Toolbar.Button>
        <Toolbar.Button
          type="button"
          aria-label={t('actions.share')}
          title={t('actions.share')}
          onClick={onShareUrl}
          className="inline-flex h-full items-center justify-center rounded-md bg-teal-600 px-2 text-white hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white focus-visible:outline-none"
        >
          <Share2 size={14} />
          <span className="ml-1 hidden text-xs md:block">
            {t('actions.share')}
          </span>
        </Toolbar.Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Toolbar.Button
              type="button"
              title={t('more.title')}
              className="inline-flex aspect-square size-9 h-full items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              <Ellipsis size={14} />
            </Toolbar.Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[160px] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-md"
            >
              {onPrint && (
                <DropdownMenu.Item
                  onSelect={onPrint}
                  className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100"
                >
                  <Printer size={16} className="mr-2" />
                  {t('menu.print')}
                </DropdownMenu.Item>
              )}
              {onDownloadMarkdown && (
                <DropdownMenu.Item
                  onSelect={() => onDownloadMarkdown()}
                  className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100"
                >
                  <Download size={16} className="mr-2" />
                  {t('menu.downloadMd')}
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                onSelect={onLoadSample}
                className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100"
              >
                <FileText size={16} className="mr-2" />
                {t('menu.loadSample')}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onClearAll}
                className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs text-red-600 outline-none select-none data-[highlighted]:bg-gray-100"
              >
                <Trash2 size={16} className="mr-2" />
                {t('menu.clearAll')}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100">
                  <Globe size={14} className="mr-2" />
                  {t('menu.language')}
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent
                  alignOffset={-4}
                  className="z-50 min-w-[160px] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-md"
                >
                  <DropdownMenu.RadioGroup
                    value={lang}
                    onValueChange={(v) => setLanguage(v)}
                  >
                    <DropdownMenu.RadioItem
                      value="en"
                      className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100"
                    >
                      <DropdownMenu.ItemIndicator className="mr-1">
                        <Check size={12} />
                      </DropdownMenu.ItemIndicator>
                      {t('menu.language.en')}
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem
                      value="ja"
                      className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100"
                    >
                      <DropdownMenu.ItemIndicator className="mr-1">
                        <Check size={12} />
                      </DropdownMenu.ItemIndicator>
                      {t('menu.language.ja')}
                    </DropdownMenu.RadioItem>
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </Toolbar.Root>
    </div>
  );
};

export const TopBar = React.memo(TopBarComponent);
export default TopBar;
