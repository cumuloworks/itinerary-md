import * as Sentry from "@sentry/astro";

// Disable Sentry in development environment
const isDev = import.meta.env.DEV;

Sentry.init({
	dsn: import.meta.env.PUBLIC_SENTRY_DSN || undefined,
	enabled: Boolean(!isDev && import.meta.env.PUBLIC_SENTRY_DSN),
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration({
			maskAllText: true,
			blockAllMedia: true,
		}),
	],
	enableLogs: isDev,
	environment: isDev
		? "development"
		: import.meta.env.PUBLIC_ENV || "production",
	release: import.meta.env.PUBLIC_RELEASE || undefined,
	tracesSampleRate: 0.2,
	tracePropagationTargets: [/^https?:\/\/(localhost|127\.0\.0\.1)/],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
