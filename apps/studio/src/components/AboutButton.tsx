import { Info } from 'lucide-react';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';

const AboutButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const dialogContainerRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const descId = useId();

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
            // Focus will be handled by FocusLock's initialFocus, fallback to container
            if (!closeButtonRef.current) {
                dialogContainerRef.current?.focus();
            }
        }
    }, [open]);

    return (
        <>
            <button
                type="button"
                aria-label="About"
                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => setOpen(true)}
                ref={triggerButtonRef}
            >
                <Info size={16} />
            </button>
            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onKeyDown={onDialogKeyDown}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            close();
                        }
                    }}
                    ref={dialogContainerRef}
                    tabIndex={-1}
                >
                    <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
                    <FocusLock returnFocus={false} shards={dialogContainerRef.current ? [dialogContainerRef.current] : undefined} disabled={!open} as="div" className="relative">
                        <div role="document" className="relative bg-white rounded-lg max-w-lg w-[90vw] p-6 shadow-xl">
                            <h2 id={titleId} className="text-lg font-semibold mb-3">
                                About
                            </h2>
                            <p id={descId} className="text-sm text-gray-600 mb-4">
                                TripMD Studio — a playground for composing travel itineraries in Markdown.
                            </p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={close} ref={closeButtonRef} data-autofocus>
                                    Close
                                </button>
                            </div>
                        </div>
                    </FocusLock>
                </div>
            )}
        </>
    );
};

export default React.memo(AboutButton);
