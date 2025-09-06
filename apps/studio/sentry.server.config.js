import * as Sentry from "@sentry/astro";

// Disable Sentry in development environment
const isDev = process.env.NODE_ENV !== "production";

Sentry.init({
	dsn: isDev ? undefined : process.env.SENTRY_DSN,
	enabled: !isDev,
	enableLogs: true,
	tracesSampleRate: 0.2,
});
