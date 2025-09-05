// @ts-nocheck
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
const isDev = process.env.NODE_ENV !== 'production';
export default defineConfig({
    adapter: vercel(),
    integrations: [react(), sitemap()],
    site: 'https://tripmd.dev',
    vite: {
        resolve: {
            dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
            alias: isDev
                ? {
                      '@itinerary-md/editor': fileURLToPath(new URL('../../packages/editor/dist', import.meta.url)),
                      '@itinerary-md/core': fileURLToPath(new URL('../../packages/core/dist', import.meta.url)),
                  }
                : {},
        },
        optimizeDeps: isDev
            ? {
                  include: ['@itinerary-md/editor', '@itinerary-md/core'],
                  force: true,
              }
            : undefined,
        plugins: [
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
                allow: [fileURLToPath(new URL('../../', import.meta.url))],
            },
            watch: {
                ignored: ['!**/node_modules/@itinerary-md/**']
            }
        },
    },
});
