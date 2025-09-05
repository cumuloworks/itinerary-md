import * as Dialog from '@radix-ui/react-dialog';
import { Share2 } from 'lucide-react';
import type React from 'react';
import { notifyError, notifySuccess } from '../../core/errors';
import { writeTextToClipboard } from '../../utils/clipboard';

interface AboutDialogProps {
    trigger: React.ReactNode;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ trigger }) => {
    const handleShareApp = async () => {
        const url = `${window.location.origin}${window.location.pathname}`;
        const shareData: ShareData = {
            title: 'TripMD Studio',
            text: 'Compose travel itineraries in Markdown with TripMD Studio.',
            url,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                notifySuccess('Thanks for sharing!');
                return;
            }
            await writeTextToClipboard(url);
            notifySuccess('App URL copied to clipboard');
        } catch {
            try {
                await writeTextToClipboard(url);
                notifySuccess('App URL copied to clipboard');
            } catch {
                notifyError('Failed to share the app');
            }
        }
    };
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg max-w-lg w-[90vw] p-6 z-50">
                    <Dialog.Title className="text-lg font-semibold mb-3">About</Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 mb-4">TripMD Studio — a playground for composing travel itineraries in Markdown.</Dialog.Description>
                    <div className="text-sm text-gray-600 space-y-2">
                        <p>
                            The cost calculation and currency conversion in this app are for reference only. Accuracy and timeliness are not guaranteed. Exchange rates are provided by
                            <a href="https://open.er-api.com" className="underline ml-1" target="_blank" rel="noopener noreferrer">
                                open.er-api.com
                            </a>
                            .
                        </p>
                        <p>
                            Source:{' '}
                            <a href="https://github.com/cumuloworks/itinerary-md" target="_blank" rel="noopener noreferrer" className="underline">
                                GitHub
                            </a>
                        </p>
                        <p>
                            Developed by{' '}
                            <a href="https://github.com/cumuloworks" target="_blank" rel="noopener noreferrer" className="underline">
                                Cumuloworks
                            </a>
                            .
                        </p>
                    </div>
                    <div className="mt-4 border-t pt-4 text-xs text-gray-500 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Studio</span>
                            <span className="font-mono">v{__APP_VERSION__}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Core</span>
                            <span className="font-mono">v{__CORE_VERSION__}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Build</span>
                            <span className="font-mono">
                                <a className="underline" href={`https://github.com/cumuloworks/itinerary-md/commit/${__GIT_COMMIT__}`} target="_blank" rel="noopener noreferrer" title={__GIT_COMMIT__}>
                                    {__GIT_COMMIT__}
                                </a>
                                {' · '}
                                {new Date(__BUILD_DATE__).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">License</span>
                            <span className="font-mono">UNLICENSED</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Issues</span>
                            <a className="underline font-mono" href="https://github.com/cumuloworks/itinerary-md/issues" target="_blank" rel="noopener noreferrer">
                                Report a bug
                            </a>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between">
                        <button
                            type="button"
                            onClick={handleShareApp}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                            aria-label="Share this app"
                            title="Share this app"
                        >
                            <Share2 size={14} />
                            Share this app
                        </button>
                        <Dialog.Close asChild>
                            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                                Close
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default AboutDialog;
