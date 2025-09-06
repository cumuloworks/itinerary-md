import * as Sentry from "@sentry/astro";

// Disable Sentry in development environment
const isDev = import.meta.env.DEV;

Sentry.init({
	dsn: isDev ? undefined : import.meta.env.PUBLIC_SENTRY_DSN,
	enabled: !isDev,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	enableLogs: true,
	tracesSampleRate: 0.2,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
