import React, { useCallback, useEffect, useRef, useState } from 'react';

const AboutButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const dialogContainerRef = useRef<HTMLDivElement | null>(null);

    const close = useCallback(() => {
        setOpen(false);
        if (triggerButtonRef.current) {
            triggerButtonRef.current.focus();
        }
    }, []);

    const onDialogKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
            }
        },
        [close]
    );

    useEffect(() => {
        if (open) {
            const focusTarget = closeButtonRef.current ?? dialogContainerRef.current;
            focusTarget?.focus();
        }
    }, [open]);

    return (
        <div className="flex items-center gap-2 p-2">
            <button
                type="button"
                aria-label="About"
                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => setOpen(true)}
                ref={triggerButtonRef}
            >
                ?
            </button>
            {open && (
                <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={onDialogKeyDown} ref={dialogContainerRef} tabIndex={-1}>
                    <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/40" onClick={close} onKeyDown={onDialogKeyDown} />
                    <div role="document" className="relative bg-white rounded-lg max-w-lg w-[90vw] p-6 shadow-xl">
                        <h2 className="text-lg font-semibold mb-3">About</h2>
                        <p className="text-sm text-gray-600 mb-4">TripMD Studio — a playground for composing travel itineraries in Markdown.</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={close} ref={closeButtonRef}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(AboutButton);
