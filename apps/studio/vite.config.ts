import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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
    plugins: [react(), tailwindcss()],
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
