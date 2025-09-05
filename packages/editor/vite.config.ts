import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@itinerary-md/core': fileURLToPath(new URL('../core/src', import.meta.url)),
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
});
