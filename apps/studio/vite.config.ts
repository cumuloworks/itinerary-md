import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@itinerary-md/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
            '@itinerary-md/statistics': fileURLToPath(new URL('../../packages/statistics/src', import.meta.url)),
        },
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
