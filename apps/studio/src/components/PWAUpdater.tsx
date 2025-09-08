import { registerSW } from 'virtual:pwa-register';
import { useEffect, useState } from 'react';

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
const INSTALL_DISMISS_KEY = 'pwa-install-dismissed-until';

export default function PWAUpdater() {
    const [showInstall, setShowInstall] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

    useEffect(() => {
        // Check if install prompt was dismissed recently
        const isDismissed = () => {
            const dismissedUntil = localStorage.getItem(INSTALL_DISMISS_KEY);
            if (!dismissedUntil) return false;

            const dismissedUntilDate = new Date(dismissedUntil);
            const now = new Date();
            return now < dismissedUntilDate;
        };

        // Handle PWA install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Only show if not dismissed recently
            if (!isDismissed()) {
                setShowInstall(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Register service worker
        if ('serviceWorker' in navigator) {
            const sw = registerSW({
                immediate: true,
                onNeedRefresh() {
                    // Show update button when new version is available
                    setShowUpdate(true);
                },
                onOfflineReady() {
                    console.log('[PWA] App ready to work offline');
                },
                onRegisterError(error) {
                    console.error('[PWA] SW registration failed:', error);
                },
            });
            setUpdateSW(() => sw);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
            // Clear dismiss timestamp on successful install
            localStorage.removeItem(INSTALL_DISMISS_KEY);
        }

        setDeferredPrompt(null);
        setShowInstall(false);
    };

    const handleUpdate = async () => {
        if (!updateSW) return;

        setIsUpdating(true);
        await updateSW(true);
    };

    const handleDismissInstall = () => {
        setShowInstall(false);
        // Save dismiss timestamp for 1 week
        const dismissUntil = new Date(Date.now() + DISMISS_DURATION_MS);
        localStorage.setItem(INSTALL_DISMISS_KEY, dismissUntil.toISOString());
        // Don't clear deferredPrompt so user can still install from browser UI
    };

    const handleDismissUpdate = () => {
        setShowUpdate(false);
    };

    return (
        <>
            {/* Install prompt */}
            {showInstall && (
                <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-xl p-5 max-w-sm border border-gray-100 z-50 animate-slide-up">
                    <div className="flex items-start gap-4">
                        {/* App Icon */}
                        <div className="flex-shrink-0">
                            <img src="/favicon.png" alt="TripMD Studio" className="w-12 h-12 rounded-lg shadow-sm" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-base">Install TripMD Studio</h3>
                            <p className="text-sm text-gray-600 mt-1">Get offline access and a native app experience.</p>
                            <div className="flex gap-2 mt-3">
                                <button type="button" onClick={handleInstall} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                    Install App
                                </button>
                                <button type="button" onClick={handleDismissInstall} className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors" title="Dismiss for 1 week">
                                    Not now
                                </button>
                            </div>
                        </div>
                        <button type="button" onClick={handleDismissInstall} className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label="Close">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <title>Close</title>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Update prompt */}
            {showUpdate && (
                <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-xl p-5 max-w-sm border border-gray-100 z-50 animate-slide-up">
                    <div className="flex items-start gap-4">
                        {/* App Icon with update badge */}
                        <div className="flex-shrink-0 relative">
                            <img src="/favicon.png" alt="TripMD Studio" className="w-12 h-12 rounded-lg shadow-sm" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <title>Update indicator</title>
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-base">Update Available</h3>
                            <p className="text-sm text-gray-600 mt-1">A new version is ready to install.</p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <title>Loading</title>
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Now'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDismissUpdate}
                                    disabled={isUpdating}
                                    className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                        <button type="button" onClick={handleDismissUpdate} disabled={isUpdating} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1" aria-label="Close">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <title>Close</title>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
