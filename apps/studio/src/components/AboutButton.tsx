import { Info, Share2, X } from 'lucide-react';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';

const AboutButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const dialogContainerRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const descId = useId();
    const licenseId = useId();
    const currentYear = new Date().getFullYear();

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

    // Ephemeral emoji popup for share action
    const [showEmoji, setShowEmoji] = useState(false);

    // (versions removed as requested)

    const copyShareLink = useCallback(async () => {
        const url = 'https://tripmd.dev';
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const temp = document.createElement('textarea');
            temp.value = url;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
        }
        setShowEmoji(true);
        window.setTimeout(() => setShowEmoji(false), 1500);
    }, []);

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
                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                            {/* Top-right close button */}
                            <button
                                type="button"
                                aria-label="Close"
                                className="absolute right-3 top-3 inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                onClick={close}
                            >
                                <X size={16} />
                            </button>

                            <h2 id={titleId} className="text-lg font-semibold mb-3">
                                About
                            </h2>
                            <p id={descId} className="text-sm text-gray-600 mb-4">
                                TripMD Studio — a playground for composing travel itineraries in Markdown.
                            </p>
                            {/* Issue link (simple hyperlink with short explanation) */}
                            <div className="mt-5 text-sm text-gray-700">
                                <p className="mb-2">This app is still in its early days. If you find an issue or have a feature idea, please let us know below.</p>
                                <a href="https://github.com/cumuloworks/itinerary-md/issues/new/choose" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    Report an issue or suggest a feature
                                </a>
                            </div>

                            {/* Notes / License textarea */}
                            <div className="mt-5">
                                <label htmlFor={licenseId} className="block text-xs font-medium text-gray-600 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    readOnly
                                    className="w-full h-24 p-2 text-xs border border-gray-300 rounded bg-gray-50 text-gray-700"
                                    id={licenseId}
                                    value={`Privacy & Data
- Your itinerary content is not sent to our servers. Parsing and preview run locally in your browser.
- We use Vercel Analytics and Sentry to improve stability and usability. They may collect anonymized usage metrics and error diagnostics (e.g., stack traces, browser/device information). Your document contents are not transmitted.

License
- This project includes components licensed under MIT.
- Use of this studio is provided as-is without warranty.`}
                                />
                            </div>

                            <div className="mt-4 text-center text-xs text-gray-500">
                                © {currentYear}{' '}
                                <a href="https://x.com/cumuloworks" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    cumuloworks
                                </a>
                            </div>

                            <div className="mt-6 flex justify-between items-center gap-2">
                                <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1" onClick={copyShareLink}>
                                    <Share2 size={14} /> Share app
                                </button>
                                <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={close} ref={closeButtonRef} data-autofocus>
                                    Close
                                </button>
                            </div>
                        </div>
                    </FocusLock>
                </div>
            )}
            {showEmoji && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] transition-opacity">
                    <div className="text-2xl select-none">🎉</div>
                </div>
            )}
        </>
    );
};

export default React.memo(AboutButton);
