import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';

interface AboutDialogProps {
    trigger: React.ReactNode;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ trigger }) => {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg max-w-lg w-[90vw] p-6 z-50">
                    <Dialog.Title className="text-lg font-semibold mb-3">About</Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 mb-4">
                        <p>Itinerary MD Studio — a playground for composing travel itineraries in Markdown.</p>
                    </Dialog.Description>
                    <div className="text-sm text-gray-600 space-y-2">
                        The cost calculation and currency conversion in this app are for reference only. Accuracy and timeliness are not guaranteed. Exchange rates are provided by
                        <a href="https://open.er-api.com" className="underline ml-1" target="_blank" rel="noreferrer">
                            open.er-api.com
                        </a>
                        .
                        <p>
                            Source:{' '}
                            <a href="https://github.com/itinerary-md/itinerary-md" target="_blank" rel="noreferrer" className="underline">
                                GitHub
                            </a>
                        </p>
                    </div>
                    <div className="mt-4 flex justify-end">
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
