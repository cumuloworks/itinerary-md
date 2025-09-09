import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DateTime } from 'luxon';
import type { ComponentType } from 'react';
import { buildGoogleCalendarUrl, buildICS, buildOutlookCalendarUrl, formatDestinationToString } from '@/utils/calendar';

type Destination =
    | { kind: 'fromTo'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
    | { kind: 'dashPair'; from: Array<{ text: string; url?: string }>; to: Array<{ text: string; url?: string }> }
    | { kind: 'single'; at: Array<{ text: string; url?: string }> }
    | undefined;

function buildGoogleSearchUrl(params: { title: string }): string {
    return `https://www.google.com/search?q=${encodeURIComponent(params.title)}`;
}

export interface EventActionsMenuProps {
    iconBgClass: string;
    IconComponent: ComponentType<{ size?: number; className?: string }>;
    title: string;
    destination: Destination;
    startISO?: string | null;
    endISO?: string | null;
    timezone?: string;
}

export function EventActionsMenu({ iconBgClass, IconComponent, title, destination, startISO, endISO, timezone }: EventActionsMenuProps) {
    const destinationText = formatDestinationToString(destination as any);
    const startDt = startISO ? DateTime.fromISO(startISO, { zone: timezone || undefined }) : null;
    const endDt = endISO ? DateTime.fromISO(endISO, { zone: timezone || undefined }) : null;

    const googleSearchUrl = buildGoogleSearchUrl({ title });
    const googleCalendarUrl = buildGoogleCalendarUrl({ title, start: startDt, end: endDt, location: destinationText || undefined });
    const outlookCalendarUrl = buildOutlookCalendarUrl({ title, start: startDt, end: endDt, location: destinationText || undefined });

    function handleDownloadIcs() {
        const ics = buildICS({ title, start: startDt, end: endDt, location: destinationText || undefined });
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const safeTitle = (title || 'event').replace(/[^\w.-]+/g, '_');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex items-center justify-center relative z-10">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button type="button" aria-label="Open event menu" className={`flex items-center justify-center rounded-full size-8 hover:brightness-110 hover:scale-110 transition ${iconBgClass}`}>
                        <IconComponent className="text-white size-4" />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content side="right" align="center" sideOffset={8} alignOffset={0} className="min-w-44 rounded-md bg-white p-1 shadow-lg border border-gray-200 focus:outline-none z-50">
                    <DropdownMenu.Item asChild>
                        <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer" className="flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-gray-800 outline-none hover:bg-gray-100">
                            Search {title} on Google
                        </a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
                    <DropdownMenu.Item asChild>
                        <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-gray-800 outline-none hover:bg-gray-100">
                            Add to Google Calendar
                        </a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <a href={outlookCalendarUrl} target="_blank" rel="noopener noreferrer" className="flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-gray-800 outline-none hover:bg-gray-100">
                            Add to Outlook Calendar
                        </a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onSelect={(e) => {
                            e.preventDefault();
                            handleDownloadIcs();
                        }}
                        className="flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-gray-800 outline-none hover:bg-gray-100"
                    >
                        Download .ics
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
}
