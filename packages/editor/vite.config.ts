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
                ...(isServe
                    ? {
                          'remark-itinerary': fileURLToPath(new URL('../core/src', import.meta.url)),
                          'remark-itinerary-alert': fileURLToPath(new URL('../alert/src', import.meta.url)),
                      }
                    : {}),
                '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
                '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
                '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
                '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
                '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
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
                external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
            },
            sourcemap: true,
            emptyOutDir: true,
        },
    };
});
