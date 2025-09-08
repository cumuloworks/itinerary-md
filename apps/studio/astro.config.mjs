// @ts-nocheck
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
    output: 'static', // Static site generation for offline support
    adapter: vercel(),
    integrations: [
        sentry({
            sourceMapsUploadOptions: {
                project: "itinerary-md-studio",
                org: "cumuloworks",
                authToken: process.env.SENTRY_AUTH_TOKEN,
            },
        }),
        react(), 
        sitemap()
    ],
    site: 'https://tripmd.dev',
    vite: {
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
                registerType: 'prompt',
                injectRegister: 'auto',
                devOptions: {
                    // Disable PWA service worker in dev to avoid caching stale hashed chunks
                    enabled: false,
                },
                includeAssets: [
                    'favicon.png',
                    'apple-touch-icon.png',
                    'android-chrome-192x192.png',
                    'android-chrome-512x512.png',
                    'sample_en.md',
                    'sample_ja.md',
                ],
                manifest: {
                    name: 'TripMD Studio',
                    short_name: 'TripMD Studio',
                    description: 'TripMD Studio is a Markdown editor for composing and sharing travel itineraries.',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    background_color: '#f3f4f6',
                    theme_color: '#155dfc',
                    icons: [
                        {
                            src: '/android-chrome-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: '/android-chrome-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        }
                    ]
                },
                workbox: {
                    clientsClaim: true,
                    skipWaiting: true,
                    cleanupOutdatedCaches: true,
                    navigateFallback: '/index.html',
                    navigateFallbackAllowlist: [/^\/$/],
                    globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2,ttf,otf,md,json}'],
                    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
                    navigateFallbackDenylist: [
                        /^\/api(\/|$)/,
                        /^\/_astro(\/|$)/,
                        /^\/workbox-.*\.js$/,
                        /^\/sw\.js$/,
                        /^\/registerSW\.js$/,
                        /^\/favicon\.png$/,
                        /^\/manifest\.webmanifest$/,
                        /^\/site\.webmanifest$/,
                        /^\/apple-touch-icon\.png$/,
                        /^\/android-chrome-\d+x\d+\.png$/,
                        /^\/ogp\.png$/,
                        /\/[^\/?]+\.(js|css|map)$/, // Only exclude JS/CSS/map files
                    ],
                    // Runtime caching for better offline experience
                    runtimeCaching: [
                        // Cache the main app shell
                        {
                            urlPattern: /^\/$|^\/index\.html$/,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'app-shell',
                                expiration: {
                                    maxEntries: 1,
                                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                                }
                            }
                        },
                        // Cache JavaScript and CSS files
                        {
                            urlPattern: /\.(?:js|css)$/i,
                            handler: 'StaleWhileRevalidate',
                            options: {
                                cacheName: 'static-resources',
                                expiration: {
                                    maxEntries: 60,
                                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                                }
                            }
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                            handler: 'StaleWhileRevalidate',
                            options: {
                                cacheName: 'google-fonts-stylesheets',
                                cacheableResponse: { statuses: [0, 200] },
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                                }
                            }
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'gstatic-fonts-cache',
                                cacheableResponse: { statuses: [0, 200] },
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                                }
                            }
                        },
                        {
                            urlPattern: /\.(?:woff2?|ttf|otf)$/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'local-fonts-cache',
                                expiration: {
                                    maxEntries: 20,
                                    maxAgeSeconds: 60 * 60 * 24 * 365
                                }
                            }
                        },
                        {
                            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'images-cache',
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
                                }
                            }
                        },
                        {
                            urlPattern: /\/sample_.*\.md$/,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'sample-files-cache',
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                                }
                            }
                        },
                        // API calls (if any)
                        {
                            urlPattern: /^\/api\//,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-cache',
                                networkTimeoutSeconds: 5,
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 5 // 5 minutes
                                }
                            }
                        }
                    ]
                },
            }),
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
    },
});
