import { registerSW } from 'virtual:pwa-register';
import { useEffect } from 'react';

export default function PWAUpdater() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const updateButton = document.getElementById('pwa-update') as HTMLButtonElement | null;

            if (!updateButton) {
                // Simple registration without UI
                registerSW({ immediate: true });
                return;
            }

            // Register with update UI
            const updateSW = registerSW({
                immediate: true,
                onNeedRefresh() {
                    // Show update button when new version is available
                    updateButton.classList.remove('hidden');
                },
                onOfflineReady() {
                    console.log('[PWA] App ready to work offline');
                },
                onRegisterError(error) {
                    console.error('[PWA] SW registration failed:', error);
                },
            });

            // Handle update button click
            const handleUpdate = () => {
                updateButton.setAttribute('disabled', 'true');
                updateButton.textContent = '更新中...';
                updateSW(true); // Trigger the update
            };

            updateButton.addEventListener('click', handleUpdate);

            // Cleanup
            return () => {
                updateButton.removeEventListener('click', handleUpdate);
            };
        }
    }, []);

    return null; // This component doesn't render anything
}
