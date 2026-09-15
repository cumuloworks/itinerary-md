// @ts-nocheck
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const EXTERNAL = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  // emitted by the React Compiler; provided by React 19 itself
  'react/compiler-runtime',
  'remark-itinerary',
  'remark-itinerary/utils',
  'remark-itinerary-alert',
];

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  return {
    plugins: [react({ compiler: true }), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: src('./src') },
        {
          find: /^use-sync-external-store\/shim(\/index\.js)?$/,
          replacement: src('./src/shims/use-sync-external-store.ts'),
        },
        ...(isServe
          ? [
              { find: 'remark-itinerary', replacement: src('../core/src') },
              {
                find: 'remark-itinerary-alert',
                replacement: src('../alert/src'),
              },
            ]
          : []),
      ],
    },
    build: {
      lib: {
        entry: src('./src/index.tsx'),
        name: 'ItineraryEditor',
        fileName: 'index',
        formats: ['es'],
      },
      rolldownOptions: {
        external: EXTERNAL,
      },
      sourcemap: false,
      emptyOutDir: false,
    },
  };
});
