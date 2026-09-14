import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Wraps vite-plugin-pwa as an Astro integration.
 *
 * Astro 7 drives Vite through the Environment API, so the plugin's own
 * `closeBundle` hook only ever observes the SSR build and never emits the
 * service worker. The worker is generated explicitly once the static output
 * has been written, mirroring what `@vite-pwa/astro` does.
 */
export function pwa(userOptions) {
    let outDir = '';
    const plugins = VitePWA({
        ...userOptions,
        integration: {
            configureOptions(_viteConfig, options) {
                options.outDir = outDir;
                options.workbox = { ...options.workbox, globDirectory: outDir };
            },
        },
    });
    const api = plugins.find((plugin) => plugin.name === 'vite-plugin-pwa')?.api;

    return {
        name: 'tripmd:pwa',
        hooks: {
            'astro:config:setup': ({ config, updateConfig }) => {
                outDir = fileURLToPath(config.outDir);
                updateConfig({ vite: { plugins: [plugins] } });
            },
            'astro:build:generated': async ({ logger }) => {
                if (!api || api.disabled) return;
                await api.generateSW();
                logger.info('service worker generated');
            },
        },
    };
}
