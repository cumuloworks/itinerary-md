import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
        setupFiles: ['test/setup.ts'],
        css: false,
    },
});
