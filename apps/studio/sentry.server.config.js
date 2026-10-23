import * as Sentry from '@sentry/astro';

import { dataCollection } from './sentry.data-collection.js';

// Disable Sentry in development environment
const isDev = process.env.NODE_ENV !== 'production';

Sentry.init({
  dsn: isDev ? undefined : process.env.SENTRY_DSN,
  enabled: !isDev,
  dataCollection,
  tracesSampleRate: 0.2,
});
