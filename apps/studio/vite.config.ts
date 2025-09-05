import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

function resolvePackageVersion(pkgUrl: URL): string {
    try {
        const json = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf-8')) as { version?: string };
        return json.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}

function resolveGitCommit(): string {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return 'unknown';
    }
}

const appVersion = resolvePackageVersion(new URL('./package.json', import.meta.url));
const coreVersion = resolvePackageVersion(new URL('../../packages/core/package.json', import.meta.url));
const gitCommit = resolveGitCommit();
const buildDate = new Date().toISOString();

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
            manifest: {
                name: 'TripMD Studio',
                short_name: 'TripMD Studio',
                theme_color: '#155dfc',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: '/android-chrome-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                navigateFallback: '/index.html',
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.destination === 'document',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'html-cache',
                        },
                    },
                    {
                        urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'assets-cache',
                        },
                    },
                    {
                        urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'static-resources',
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                    {
                        urlPattern: /https:\/\/open\.er-api\.com\/v6\/latest\/USD/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-currency',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 12 },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@itinerary-md/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(appVersion),
        __CORE_VERSION__: JSON.stringify(coreVersion),
        __GIT_COMMIT__: JSON.stringify(gitCommit),
        __BUILD_DATE__: JSON.stringify(buildDate),
    },
    server: {
        port: 3000,
        host: true,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
        setupFiles: ['test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
    },
});
