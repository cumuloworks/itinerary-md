import { Check, Info, Share2, X } from 'lucide-react';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';

type AboutButtonProps = {
    /** URL to share/copy. If not provided, uses PUBLIC_SHARE_URL, then window.location.origin */
    shareUrl?: string;
};

const AboutButton: React.FC<AboutButtonProps> = ({ shareUrl }) => {
    const [open, setOpen] = useState(false);
    const [showThanks, setShowThanks] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const dialogContainerRef = useRef<HTMLDivElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleId = useId();
    const descId = useId();
    const licenseId = useId();
    const thanksTitleId = useId();
    const thanksDescId = useId();
    const currentYear = new Date().getFullYear();

    const close = useCallback(() => {
        setOpen(false);
        setShowThanks(false); // Reset thanks message when closing
        setErrorMessage(null);
        // Clear any timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
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

    const startThanksTimer = useCallback(() => {
        setShowThanks(true);
        setErrorMessage(null);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setShowThanks(false);
            timerRef.current = null;
        }, 3000);
    }, []);

    const resolveShareUrl = useCallback((): string => {
        const envUrl = (import.meta as any)?.env?.PUBLIC_SHARE_URL as string | undefined;
        if (shareUrl && shareUrl.length > 0) return shareUrl;
        if (envUrl && envUrl.length > 0) return envUrl;
        if (typeof window !== 'undefined') return window.location.origin;
        return '';
    }, [shareUrl]);

    const copyShareLink = useCallback(async () => {
        const url = resolveShareUrl();
        // Clear any existing timer on new attempt
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setErrorMessage(null);

        try {
            // 1) Try Web Share API first
            if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
                try {
                    await (navigator as any).share({ url });
                    startThanksTimer();
                    return;
                } catch {
                    // fall through to clipboard
                }
            }

            // 2) Try async clipboard API
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(url);
                startThanksTimer();
                return;
            }

            // 3) Fallback to document.execCommand('copy') and check boolean result
            const temp = document.createElement('textarea');
            temp.value = url;
            temp.setAttribute('readonly', '');
            temp.style.position = 'absolute';
            temp.style.left = '-9999px';
            document.body.appendChild(temp);
            temp.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(temp);
            if (ok) {
                startThanksTimer();
                return;
            }

            throw new Error('Copy command was rejected');
        } catch {
            // Failure: show error UI and ensure no timers are pending
            setShowThanks(false);
            setErrorMessage('Failed to share or copy the URL. Please try again.');
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [resolveShareUrl, startThanksTimer]);

    const handleReturnToAbout = useCallback(() => {
        setShowThanks(false);
        setErrorMessage(null);
        // Clear timer if user clicks to return
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (open) {
            // Focus will be handled by FocusLock's initialFocus, fallback to container
            if (!closeButtonRef.current) {
                dialogContainerRef.current?.focus();
            }
        }
    }, [open]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

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
                            {showThanks ? (
                                // Thank you state - show for 3 seconds or until clicked
                                <button type="button" className="flex flex-col items-center py-8 cursor-pointer w-full focus:outline-none" onClick={handleReturnToAbout} aria-label="Return to About dialog">
                                    <div className="relative mb-6">
                                        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-30" />
                                            <Share2 size={32} className="text-teal-600 relative z-10" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                            <Check size={16} className="text-white" />
                                        </div>
                                    </div>
                                    <h2 id={thanksTitleId} className="text-2xl font-bold text-gray-800 mb-2">
                                        Thank you!
                                    </h2>
                                    <p id={thanksDescId} className="text-lg text-gray-600 mb-4">
                                        URL Copied to Clipboard
                                    </p>
                                    <div className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                        Click anywhere to return
                                    </div>
                                </button>
                            ) : errorMessage ? (
                                <button type="button" className="flex flex-col items-center py-8 cursor-pointer w-full focus:outline-none" onClick={handleReturnToAbout} aria-label="Return to About dialog">
                                    <div className="relative mb-6">
                                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-30" />
                                            <X size={32} className="text-red-600 relative z-10" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                                    <p className="text-lg text-gray-600 mb-4">{errorMessage}</p>
                                    <div className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Click anywhere to return</div>
                                </button>
                            ) : (
                                <>
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
                                        <a href="https://github.com/cumuloworks/itinerary-md/issues/new/choose" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
                                        <a href="https://x.com/cumuloworks" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            Cumuloworks
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
                                </>
                            )}
                        </div>
                    </FocusLock>
                </div>
            )}
        </>
    );
};

export default React.memo(AboutButton);
