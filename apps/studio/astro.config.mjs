// @ts-nocheck
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
    adapter: vercel(),
    integrations: [react(), sitemap()],
    site: 'https://tripmd.dev',
    vite: {
        resolve: {
            dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
            alias: {
                // Avoid DOM-specific entry on SSR: always use universal implementation
                'decode-named-character-reference/index.dom.js': 'decode-named-character-reference/index.js',
            },
        },
        optimizeDeps: {
            exclude: ['@itinerary-md/editor', '@itinerary-md/core'],
        },
        ssr: {
            noExternal: ['@itinerary-md/editor', '@itinerary-md/core'],
        },
        plugins: [
            // Force full reload when local workspace packages are rebuilt
            {
                name: 'reload-editor-core-dist',
                configureServer(server) {
                    const editorDist = fileURLToPath(new URL('../../packages/editor/dist', import.meta.url));
                    const coreDist = fileURLToPath(new URL('../../packages/core/dist', import.meta.url));
                    server.watcher.add([editorDist, coreDist]);
                    server.watcher.on('change', (changedPath) => {
                        if (changedPath.startsWith(editorDist) || changedPath.startsWith(coreDist)) {
                            server.ws.send({ type: 'full-reload' });
                        }
                    });
                },
            },
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: 'auto',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
                workbox: {
                    navigateFallback: '/index.html',
                    navigateFallbackDenylist: [
                        /^\/api(\/|$)/,
                        /^\/_astro(\/|$)/,
                        /^\/workbox-.*\.js$/,
                        /^\/sw\.js$/,
                        /^\/registerSW\.js$/,
                        /^\/favicon\.ico$/,
                        /^\/manifest\.webmanifest$/,
                        /^\/site\.webmanifest$/,
                        /^\/apple-touch-icon\.png$/,
                        /^\/android-chrome-\d+x\d+\.png$/,
                        /^\/ogp\.png$/,
                        /\/[^\/?]+\.[^/]+$/, // file-like URLs with extensions
                    ],
                },
            }),
        ],
        server: {
            fs: {
                allow: [fileURLToPath(new URL('../../', import.meta.url))]
            }
        },
    },
});
