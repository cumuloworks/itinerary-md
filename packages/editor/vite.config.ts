// @ts-nocheck
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isServe = command === 'serve';
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                ...(isServe
                    ? {
                          'remark-itinerary': fileURLToPath(new URL('../core/src', import.meta.url)),
                          'remark-itinerary-alert': fileURLToPath(new URL('../alert/src', import.meta.url)),
                      }
                    : {}),
            },
        },
        build: {
            lib: {
                entry: fileURLToPath(new URL('./src/index.tsx', import.meta.url)),
                name: 'ItineraryEditor',
                fileName: 'index',
                formats: ['es'],
            },
            rollupOptions: {
                external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'remark-itinerary', 'remark-itinerary/utils', 'remark-itinerary-alert'],
            },
            sourcemap: false,
            emptyOutDir: false,
        },
    };
});
