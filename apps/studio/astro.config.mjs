// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
    adapter: vercel(),
    integrations: [react(), sitemap()],

    vite: {
        resolve: {
            dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
        },
        plugins: [
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: 'auto',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
                workbox: {
                    navigateFallback: '/index.html',
                },
            }),
        ],
    },
});
