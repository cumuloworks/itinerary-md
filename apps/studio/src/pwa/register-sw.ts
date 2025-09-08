export {};

// Only run in production
if (import.meta.env.PROD) {
    // Dynamically import to ensure proper module resolution and no SSR eval in Astro
    import('virtual:pwa-register')
        .then(({ registerSW }) => {
            const updateButton = document.getElementById('pwa-update');
            const updateSW = registerSW({
                immediate: true,
                onNeedRefresh() {
                    updateButton?.classList.remove('hidden');
                },
                onOfflineReady() {
                    // no-op
                },
            });
            updateButton?.addEventListener('click', () => {
                updateSW(true);
            });
        })
        .catch(() => {
            // ignore
        });
}
